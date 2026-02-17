package com.usa.attendancesystem.service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.Reader;
import java.io.StringWriter;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVPrinter;
import org.apache.commons.csv.CSVRecord;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.usa.attendancesystem.dto.BatchDto;
import com.usa.attendancesystem.dto.CsvImportResultDto;
import com.usa.attendancesystem.dto.StudentCsvImportRequest;
import com.usa.attendancesystem.dto.StudentDto;
import com.usa.attendancesystem.dto.SubjectDto;
import com.usa.attendancesystem.exception.ResourceNotFoundException;
import com.usa.attendancesystem.model.Batch;
import com.usa.attendancesystem.model.Student;
import com.usa.attendancesystem.model.Subject;
import com.usa.attendancesystem.repository.BatchRepository;
import com.usa.attendancesystem.repository.StudentRepository;
import com.usa.attendancesystem.repository.SubjectRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class CsvImportService {

    private final StudentRepository studentRepository;
    private final BatchRepository batchRepository;
    private final SubjectRepository subjectRepository;
    private final StudentService studentService;

    // Helper method to parse dates in multiple formats
    private LocalDate parseFlexibleDate(String dateStr) throws DateTimeParseException {
        if (dateStr == null || dateStr.trim().isEmpty()) {
            throw new DateTimeParseException("Date string is empty", dateStr, 0);
        }

        String trimmedDate = dateStr.trim();

        // List of supported date formats
        DateTimeFormatter[] formatters = {
            DateTimeFormatter.ofPattern("yyyy-MM-dd"), // YYYY-MM-DD (preferred)
            DateTimeFormatter.ofPattern("dd/MM/yyyy"), // DD/MM/YYYY 
            DateTimeFormatter.ofPattern("dd-MM-yyyy"), // DD-MM-YYYY
            DateTimeFormatter.ofPattern("MM/dd/yyyy"), // MM/DD/YYYY (US format)
            DateTimeFormatter.ofPattern("MM-dd-yyyy") // MM-DD-YYYY (US format)
        };

        // Try each format
        for (DateTimeFormatter formatter : formatters) {
            try {
                return LocalDate.parse(trimmedDate, formatter);
            } catch (DateTimeParseException e) {
                // Continue to next format
            }
        }

        // If no format worked, throw exception with helpful message
        throw new DateTimeParseException("Invalid date format. Supported formats: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY", dateStr, 0);
    }

    // Dynamic headers - will be generated based on available subjects
    private String[] getCsvHeaders() {
        List<String> headers = new ArrayList<>();
        headers.add("Student ID Code");
        headers.add("Admission Date (YYYY-MM-DD or DD/MM/YYYY)");
        headers.add("Full Name");
        headers.add("Address");
        headers.add("NIC (Optional)");
        headers.add("School");
        headers.add("Phone No");

        // Add individual subject columns
        List<Subject> allSubjects = subjectRepository.findAll();
        for (Subject subject : allSubjects) {
            headers.add(subject.getName());
        }

        return headers.toArray(new String[0]);
    }

    public CsvImportResultDto importStudentsFromCsv(MultipartFile file, Integer batchId) {
        log.info("Starting import process for file: {} with batch ID: {}", file.getOriginalFilename(), batchId);

        // Validate batch exists
        Batch batch = batchRepository.findById(batchId)
                .orElseThrow(() -> new RuntimeException("Batch not found with ID: " + batchId));

        String fileName = file.getOriginalFilename();
        if (fileName == null) {
            throw new IllegalArgumentException("File name cannot be null");
        }

        try {
            if (fileName.toLowerCase().endsWith(".csv")) {
                return importFromCsv(file, batch);
            } else if (fileName.toLowerCase().endsWith(".xlsx") || fileName.toLowerCase().endsWith(".xls")) {
                return importFromExcel(file, batch);
            } else {
                throw new IllegalArgumentException("Unsupported file format. Please use CSV or Excel files.");
            }
        } catch (Exception e) {
            log.error("Error processing file", e);
            throw new RuntimeException("Failed to process file: " + e.getMessage(), e);
        }
    }

    private CsvImportResultDto importFromCsv(MultipartFile file, Batch batch) {
        List<String> errors = new ArrayList<>();
        List<StudentDto> importedStudents = new ArrayList<>();
        int totalRows = 0;

        try (Reader reader = new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8); CSVParser csvParser = new CSVParser(reader, CSVFormat.DEFAULT.withFirstRecordAsHeader())) {

            List<CSVRecord> records = csvParser.getRecords();
            totalRows = records.size();

            log.info("Starting CSV validation with {} records for batch: {}", totalRows, batch.getBatchYear());

            // PHASE 1: Validate all records first
            List<StudentCsvImportRequest> validatedRequests = new ArrayList<>();
            for (int i = 0; i < records.size(); i++) {
                CSVRecord record = records.get(i);
                int rowNumber = i + 2; // +2 because CSV rows start from 1 and we have a header

                try {
                    StudentCsvImportRequest studentRequest = parseRecord(record, rowNumber);
                    // Validate the request (including Student ID format)
                    validateStudentRequest(studentRequest, batch);
                    validatedRequests.add(studentRequest);
                } catch (Exception e) {
                    String errorMsg = "Row " + rowNumber + ": " + e.getMessage();
                    errors.add(errorMsg);
                    log.warn("CSV validation failed at row {}: {}", rowNumber, e.getMessage());
                }
            }

            // PHASE 2: If there are any errors, stop and return without importing
            if (!errors.isEmpty()) {
                log.warn("CSV validation completed with {} errors. Aborting import.", errors.size());
                return new CsvImportResultDto(totalRows, 0, totalRows, errors, new ArrayList<>());
            }

            // PHASE 3: All records validated successfully - now import them
            log.info("CSV validation successful with {} records. Importing to database...", totalRows);
            for (StudentCsvImportRequest studentRequest : validatedRequests) {
                try {
                    StudentDto createdStudent = createStudentFromRequest(studentRequest, batch);
                    importedStudents.add(createdStudent);
                    log.debug("Successfully imported student: {}", studentRequest.fullName());
                } catch (Exception e) {
                    // This should rarely happen since we already validated, but handle it
                    String errorMsg = "Row import error: " + e.getMessage();
                    errors.add(errorMsg);
                    log.error("Error creating student during import phase: {}", e.getMessage());
                }
            }

        } catch (Exception e) {
            log.error("Error reading CSV file", e);
            throw new RuntimeException("Failed to read CSV file: " + e.getMessage(), e);
        }

        int successfulImports = importedStudents.size();
        log.info("CSV import completed. Total: {}, Imported: {}, Errors: {}", totalRows, successfulImports, errors.size());
        return new CsvImportResultDto(totalRows, successfulImports, errors.size(), errors, importedStudents);
    }

    @Transactional
    private StudentDto createStudentFromRequest(StudentCsvImportRequest studentRequest, Batch batch) {
        try {
            // Use the batch provided instead of looking it up
            // Parse selected subjects and find subject entities
            Set<Subject> subjects = parseSubjects(studentRequest.subjectNames());

            // Use the provided Student ID Code (not auto-generated for bulk import)
            String studentId = studentRequest.studentIdCode();

            // Create and save student
            Student student = Student.builder()
                    .studentIdCode(studentId)
                    .fullName(studentRequest.fullName())
                    .address(studentRequest.address())
                    .nic(studentRequest.nic())
                    .school(studentRequest.school())
                    .admissionDate(studentRequest.admissionDate())
                    .parentPhone(studentRequest.phoneNumber())
                    .indexNumber(studentService.getNextIndexNumberForBatch(batch.getId()))
                    .isActive(true)
                    .batch(batch)
                    .subjects(subjects)
                    .build();

            Student savedStudent = studentRepository.save(student);

            // Convert to DTO and return
            return studentToDto(savedStudent);
        } catch (Exception e) {
            log.error("Error creating student: {}", e.getMessage());
            throw new RuntimeException("Failed to create student: " + e.getMessage(), e);
        }
    }

    /**
     * Validates a StudentCsvImportRequest without creating the student.
     * This is used in the validation phase before importing any records.
     */
    private void validateStudentRequest(StudentCsvImportRequest studentRequest, Batch batch) {
        // Validate Student ID format against batch format
        validateStudentIdFormat(studentRequest.studentIdCode(), batch);
        
        // Validate required fields
        if (studentRequest.fullName() == null || studentRequest.fullName().trim().isEmpty()) {
            throw new RuntimeException("Full Name is required");
        }
        if (studentRequest.address() == null || studentRequest.address().trim().isEmpty()) {
            throw new RuntimeException("Address is required");
        }
        if (studentRequest.school() == null || studentRequest.school().trim().isEmpty()) {
            throw new RuntimeException("School is required");
        }
        if (studentRequest.phoneNumber() == null || studentRequest.phoneNumber().trim().isEmpty()) {
            throw new RuntimeException("Phone Number is required");
        }
        if (studentRequest.admissionDate() == null) {
            throw new RuntimeException("Admission Date is required");
        }
        if (studentRequest.subjectNames() == null || studentRequest.subjectNames().trim().isEmpty()) {
            throw new RuntimeException("At least one subject is required");
        }
        
        // Validate subjects exist
        Set<Subject> subjects = parseSubjects(studentRequest.subjectNames());
        if (subjects.isEmpty()) {
            throw new RuntimeException("No valid subjects selected");
        }
    }

    private CsvImportResultDto importFromExcel(MultipartFile file, Batch batch) {
        List<String> errors = new ArrayList<>();
        List<StudentDto> importedStudents = new ArrayList<>();
        int totalRows = 0;

        try (Workbook workbook = createWorkbook(file)) {
            Sheet sheet = workbook.getSheetAt(0); // Use first sheet

            totalRows = sheet.getLastRowNum(); // Exclude header row

            if (totalRows <= 0) {
                throw new IllegalArgumentException("Excel file is empty or contains only headers");
            }

            log.info("Starting Excel validation with {} records for batch: {}", totalRows, batch.getBatchYear());

            // Get headers from first row
            Row headerRow = sheet.getRow(0);
            List<String> headers = new ArrayList<>();
            for (Cell cell : headerRow) {
                headers.add(getCellValueAsString(cell));
            }

            // PHASE 1: Validate all records first
            List<StudentCsvImportRequest> validatedRequests = new ArrayList<>();
            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) {
                    continue;
                }

                int rowNumber = i + 1; // Excel row numbers start from 1

                try {
                    StudentCsvImportRequest studentRequest = parseExcelRow(row, headers, rowNumber);
                    // Validate the request (including Student ID format)
                    validateStudentRequest(studentRequest, batch);
                    validatedRequests.add(studentRequest);
                } catch (Exception e) {
                    String error = String.format("Row %d: %s", rowNumber, e.getMessage());
                    errors.add(error);
                    log.warn("Excel validation failed at row {}: {}", rowNumber, e.getMessage());
                }
            }

            // PHASE 2: If there are any errors, stop and return without importing
            if (!errors.isEmpty()) {
                log.warn("Excel validation completed with {} errors. Aborting import.", errors.size());
                return new CsvImportResultDto(totalRows, 0, totalRows, errors, new ArrayList<>());
            }

            // PHASE 3: All records validated successfully - now import them
            log.info("Excel validation successful with {} records. Importing to database...", totalRows);
            for (StudentCsvImportRequest studentRequest : validatedRequests) {
                try {
                    StudentDto createdStudent = createStudentFromRequest(studentRequest, batch);
                    importedStudents.add(createdStudent);
                    log.debug("Successfully imported student: {}", studentRequest.fullName());
                } catch (Exception e) {
                    // This should rarely happen since we already validated, but handle it
                    String error = "Import error: " + e.getMessage();
                    errors.add(error);
                    log.error("Error creating student during import phase: {}", e.getMessage());
                }
            }

        } catch (Exception e) {
            String error = "Failed to read Excel file: " + e.getMessage();
            errors.add(error);
            log.error("Excel file reading error", e);
        }

        int successfulImports = importedStudents.size();
        int failedImports = totalRows - successfulImports;
        log.info("Excel import completed: {} imported, {} errors out of {} total",
                successfulImports, failedImports, totalRows);

        return new CsvImportResultDto(
                totalRows,
                successfulImports,
                failedImports,
                errors,
                importedStudents
        );
    }

    private Workbook createWorkbook(MultipartFile file) throws Exception {
        String fileName = file.getOriginalFilename();
        if (fileName.toLowerCase().endsWith(".xlsx")) {
            return new XSSFWorkbook(file.getInputStream());
        } else if (fileName.toLowerCase().endsWith(".xls")) {
            return new HSSFWorkbook(file.getInputStream());
        } else {
            throw new IllegalArgumentException("Unsupported Excel file format");
        }
    }

    private String getCellValueAsString(Cell cell) {
        if (cell == null) {
            return "";
        }

        switch (cell.getCellType()) {
            case STRING:
                return cell.getStringCellValue().trim();
            case NUMERIC:
                if (DateUtil.isCellDateFormatted(cell)) {
                    return cell.getDateCellValue().toString();
                } else {
                    return String.valueOf((long) cell.getNumericCellValue());
                }
            case BOOLEAN:
                return String.valueOf(cell.getBooleanCellValue());
            case FORMULA:
                return cell.getCellFormula();
            default:
                return "";
        }
    }

    private StudentCsvImportRequest parseExcelRow(Row row, List<String> headers, int rowNumber) {
        try {
            // Parse fields in the exact order as add student form
            String studentIdCode = getCellValueByHeader(row, headers, "Student ID Code");
            String admissionDateStr = getCellValueByHeader(row, headers, "Admission Date (YYYY-MM-DD or DD/MM/YYYY)");
            String fullName = getCellValueByHeader(row, headers, "Full Name");
            String address = getCellValueByHeader(row, headers, "Address");
            String nic = getCellValueByHeaderOptional(row, headers, "NIC (Optional)");
            String school = getCellValueByHeader(row, headers, "School");
            String phoneNumber = getCellValueByHeader(row, headers, "Phone No");

            // Parse individual subject columns and build subject names string
            List<Subject> allSubjects = subjectRepository.findAll();
            List<String> selectedSubjects = new ArrayList<>();

            for (Subject subject : allSubjects) {
                String subjectValue = getCellValueByHeaderOptional(row, headers, subject.getName());
                if (subjectValue != null && ("1".equals(subjectValue.trim()) || "1.0".equals(subjectValue.trim()))) {
                    selectedSubjects.add(subject.getName());
                }
            }

            if (selectedSubjects.isEmpty()) {
                throw new IllegalArgumentException("At least one subject must be selected (marked with 1)");
            }

            String subjectNames = String.join(", ", selectedSubjects);

            // Validate and parse admission date
            LocalDate admissionDate;
            try {
                admissionDate = parseFlexibleDate(admissionDateStr);
            } catch (Exception e) {
                throw new IllegalArgumentException("Invalid admission date format. Supported formats: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY. Got: " + admissionDateStr);
            }

            // Validate and normalize phone number format
            String cleanPhone = phoneNumber.trim().replaceAll("[^0-9]", "");

            // Handle different phone number formats
            if (cleanPhone.matches("^[1-9]\\d{7,8}$")) {
                // Add leading 0 if missing (e.g., 771234567 -> 0771234567)
                cleanPhone = "0" + cleanPhone;
            } else if (!cleanPhone.matches("^0[1-9]\\d{7,8}$")) {
                // Invalid format after all normalization attempts
                throw new IllegalArgumentException("Invalid phone number format. Use Sri Lankan format (0771234567 or 771234567): " + phoneNumber);
            }

            return new StudentCsvImportRequest(
                    studentIdCode.trim(),
                    admissionDate,
                    fullName.trim(),
                    address.trim(),
                    nic != null && !nic.trim().isEmpty() ? nic.trim() : null,
                    school.trim(),
                    cleanPhone,
                    0, // batchId placeholder - actual batch is provided separately
                    subjectNames
            );
        } catch (Exception e) {
            throw new IllegalArgumentException("Error parsing Excel row: " + e.getMessage());
        }
    }

    private String getCellValueByHeader(Row row, List<String> headers, String headerName) {
        int columnIndex = headers.indexOf(headerName);
        if (columnIndex == -1) {
            throw new IllegalArgumentException("Required column '" + headerName + "' not found");
        }

        Cell cell = row.getCell(columnIndex);
        String value = getCellValueAsString(cell);

        if (value.isEmpty()) {
            throw new IllegalArgumentException(headerName + " is required but was empty");
        }

        return value;
    }

    private String getCellValueByHeaderOptional(Row row, List<String> headers, String headerName) {
        int columnIndex = headers.indexOf(headerName);
        if (columnIndex == -1) {
            return null; // Optional column not found
        }

        Cell cell = row.getCell(columnIndex);
        return getCellValueAsString(cell);
    }

    private StudentCsvImportRequest parseRecord(CSVRecord record, int rowNumber) {
        try {
            // Parse fields in the exact order as add student form
            String studentIdCode = getFieldValue(record, "Student ID Code", rowNumber);
            String admissionDateStr = getFieldValue(record, "Admission Date (YYYY-MM-DD or DD/MM/YYYY)", rowNumber);
            String fullName = getFieldValue(record, "Full Name", rowNumber);
            String address = getFieldValue(record, "Address", rowNumber);
            String nic = getOptionalFieldValue(record, "NIC (Optional)"); // Optional field
            String school = getFieldValue(record, "School", rowNumber);
            String phoneNumber = getFieldValue(record, "Phone No", rowNumber);

            // Parse individual subject columns and build subject names string
            List<Subject> allSubjects = subjectRepository.findAll();
            List<String> selectedSubjects = new ArrayList<>();

            for (Subject subject : allSubjects) {
                try {
                    String subjectValue = record.get(subject.getName());
                    if ("1".equals(subjectValue.trim())) {
                        selectedSubjects.add(subject.getName());
                    }
                } catch (IllegalArgumentException e) {
                    // Subject column not found, skip
                }
            }

            if (selectedSubjects.isEmpty()) {
                throw new IllegalArgumentException("At least one subject must be selected (marked with 1)");
            }

            String subjectNames = String.join(", ", selectedSubjects);

            // Validate and parse admission date
            LocalDate admissionDate;
            try {
                admissionDate = parseFlexibleDate(admissionDateStr);
            } catch (Exception e) {
                throw new IllegalArgumentException("Invalid admission date format. Supported formats: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY. Got: " + admissionDateStr);
            }

            // Validate NIC format if provided
            if (nic != null && !nic.trim().isEmpty()) {
                String nicTrimmed = nic.trim();

                // Handle scientific notation from Excel (e.g., "2.00012E+11")
                if (nicTrimmed.matches(".*[eE][+-]?\\d+.*")) {
                    try {
                        // Convert scientific notation to long and then to string
                        double scientificValue = Double.parseDouble(nicTrimmed);
                        nicTrimmed = String.format("%.0f", scientificValue);
                    } catch (NumberFormatException e) {
                        throw new IllegalArgumentException("Invalid NIC format. Use 123456789V or 123456789012: " + nicTrimmed);
                    }
                }

                // Validate NIC format: 9 digits + V/X or 12 digits
                if (!nicTrimmed.matches("^([0-9]{9}[vVxX]|[0-9]{12})$")) {
                    throw new IllegalArgumentException("Invalid NIC format. Use 123456789V or 123456789012: " + nicTrimmed);
                }

                // Update the nic variable with cleaned value
                nic = nicTrimmed;
            }

            // Validate and normalize phone number format
            String cleanPhone = phoneNumber.trim().replaceAll("[^0-9]", "");

            // Handle different phone number formats
            if (cleanPhone.matches("^[1-9]\\d{7,8}$")) {
                // Add leading 0 if missing (e.g., 771234567 -> 0771234567)
                cleanPhone = "0" + cleanPhone;
            } else if (!cleanPhone.matches("^0[1-9]\\d{7,8}$")) {
                // Invalid format after all normalization attempts
                throw new IllegalArgumentException("Invalid phone number format. Use Sri Lankan format (0771234567 or 771234567): " + phoneNumber);
            }

            return new StudentCsvImportRequest(
                    studentIdCode.trim(),
                    admissionDate,
                    fullName.trim(),
                    address.trim(),
                    nic != null && !nic.trim().isEmpty() ? nic.trim() : null,
                    school.trim(),
                    cleanPhone,
                    0, // batchId placeholder - actual batch is provided separately
                    subjectNames
            );
        } catch (Exception e) {
            throw new IllegalArgumentException("Error parsing CSV record: " + e.getMessage());
        }
    }

    private String getFieldValue(CSVRecord record, String header, int rowNumber) {
        try {
            String value = record.get(header);
            if (value == null || value.trim().isEmpty()) {
                throw new IllegalArgumentException(header + " is required but was empty");
            }
            return value;
        } catch (IllegalArgumentException e) {
            if (e.getMessage().contains("Mapping for")) {
                throw new IllegalArgumentException("Missing required column: " + header);
            }
            throw e;
        }
    }

    private String getOptionalFieldValue(CSVRecord record, String header) {
        try {
            String value = record.get(header);
            return (value != null && !value.trim().isEmpty()) ? value : null;
        } catch (IllegalArgumentException e) {
            // Column doesn't exist, return null for optional fields
            return null;
        }
    }


    private Set<Subject> parseSubjects(String subjectNames) {
        if (subjectNames == null || subjectNames.trim().isEmpty()) {
            throw new IllegalArgumentException("At least one subject is required");
        }

        String[] subjectNameArray = subjectNames.split(",");
        Set<Subject> subjects = new HashSet<>();

        for (String subjectName : subjectNameArray) {
            String trimmedName = subjectName.trim();
            if (!trimmedName.isEmpty()) {
                Subject subject = subjectRepository.findByName(trimmedName)
                        .orElseThrow(() -> new ResourceNotFoundException(
                        "Subject '" + trimmedName + "' not found"));
                subjects.add(subject);
            }
        }

        if (subjects.isEmpty()) {
            throw new IllegalArgumentException("At least one valid subject is required");
        }

        return subjects;
    }

    public String generateCsvTemplate() {
        try (StringWriter writer = new StringWriter(); CSVPrinter csvPrinter = new CSVPrinter(writer, CSVFormat.DEFAULT.withHeader(getCsvHeaders()))) {

            List<Subject> allSubjects = subjectRepository.findAll();

            // Add sample data rows for reference matching the expected format
            // Row 1: John Doe - Mathematics and Physics student
            List<Object> row1 = new ArrayList<>();
            row1.add("JD001");                          // Student ID Code
            row1.add("2024-01-15");                     // Admission Date (YYYY-MM-DD)
            row1.add("John Doe");                       // Full Name
            row1.add("123 Main Street, Colombo 03");    // Address
            row1.add("123456789V");                     // NIC (Optional)
            row1.add("Royal College");                  // School
            row1.add("0771234567");                     // Phone No
            // Add subject values (1 for selected, 0 for not selected)
            for (Subject subject : allSubjects) {
                if ("Mathematics".equalsIgnoreCase(subject.getName()) || "Physics".equalsIgnoreCase(subject.getName())) {
                    row1.add("1");
                } else {
                    row1.add("0");
                }
            }
            csvPrinter.printRecord(row1.toArray());

            // Row 2: Jane Smith - Chemistry student
            List<Object> row2 = new ArrayList<>();
            row2.add("JS002");                          // Student ID Code
            row2.add("2024-02-20");                     // Admission Date (YYYY-MM-DD)
            row2.add("Jane Smith");                     // Full Name
            row2.add("456 Lake Road, Kandy");           // Address
            row2.add("987654321V");                     // NIC (Optional)
            row2.add("Vishaka Vidyalaya");              // School
            row2.add("0773456789");                     // Phone No
            // Add subject values
            for (Subject subject : allSubjects) {
                if ("Chemistry".equalsIgnoreCase(subject.getName())) {
                    row2.add("1");
                } else {
                    row2.add("0");
                }
            }
            csvPrinter.printRecord(row2.toArray());

            // Row 3: Bob Johnson - Multiple subjects student
            List<Object> row3 = new ArrayList<>();
            row3.add("BJ003");                          // Student ID Code
            row3.add("2025-03-10");                     // Admission Date (YYYY-MM-DD)
            row3.add("Bob Johnson");                    // Full Name
            row3.add("789 Hill View, Galle");           // Address
            row3.add("200012345678");                   // NIC (Optional) - new format
            row3.add("Richmond College");               // School
            row3.add("0114567890");                     // Phone No
            // Add subject values
            for (Subject subject : allSubjects) {
                if ("Mathematics".equalsIgnoreCase(subject.getName())
                        || "Chemistry".equalsIgnoreCase(subject.getName())
                        || "Physics".equalsIgnoreCase(subject.getName())) {
                    row3.add("1");
                } else {
                    row3.add("0");
                }
            }
            csvPrinter.printRecord(row3.toArray());

            // Row 4: Example with different combination
            List<Object> row4 = new ArrayList<>();
            row4.add("SW004");                          // Student ID Code
            row4.add("2025-04-05");                     // Admission Date (YYYY-MM-DD)
            row4.add("Sarah Wilson");                   // Full Name
            row4.add("321 Beach Road, Negombo");        // Address
            row4.add("");                               // NIC (Optional) - empty
            row4.add("Holy Family Convent");            // School
            row4.add("0779876543");                     // Phone No
            // Add subject values
            for (Subject subject : allSubjects) {
                if ("Biology".equalsIgnoreCase(subject.getName()) || "Chemistry".equalsIgnoreCase(subject.getName())) {
                    row4.add("1");
                } else {
                    row4.add("0");
                }
            }
            csvPrinter.printRecord(row4.toArray());

            csvPrinter.flush();
            return writer.toString();
        } catch (IOException e) {
            log.error("Error generating CSV template", e);
            throw new RuntimeException("Failed to generate CSV template", e);
        }
    }

    public byte[] generateExcelTemplate() {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet("Student Import");
            List<Subject> allSubjects = subjectRepository.findAll();
            String[] headers = getCsvHeaders();

            // Create header row
            Row headerRow = sheet.createRow(0);
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);

            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            // Create sample data rows matching the expected format
            // Row 1: John Doe - Mathematics and Physics student
            Row row1 = sheet.createRow(1);
            int colIndex = 0;
            row1.createCell(colIndex++).setCellValue("JD001");                       // Student ID Code
            row1.createCell(colIndex++).setCellValue("2024-01-15");                  // Admission Date
            row1.createCell(colIndex++).setCellValue("John Doe");                    // Full Name
            row1.createCell(colIndex++).setCellValue("123 Main Street, Colombo 03");  // Address
            row1.createCell(colIndex++).setCellValue("123456789V");                  // NIC
            row1.createCell(colIndex++).setCellValue("Royal College");               // School
            row1.createCell(colIndex++).setCellValue("0771234567");                  // Phone No
            // Add subject values
            for (Subject subject : allSubjects) {
                if ("Mathematics".equalsIgnoreCase(subject.getName()) || "Physics".equalsIgnoreCase(subject.getName())) {
                    row1.createCell(colIndex++).setCellValue(1);
                } else {
                    row1.createCell(colIndex++).setCellValue(0);
                }
            }

            // Row 2: Jane Smith - Chemistry student
            Row row2 = sheet.createRow(2);
            colIndex = 0;
            row2.createCell(colIndex++).setCellValue("JS002");                       // Student ID Code
            row2.createCell(colIndex++).setCellValue("2024-02-20");                  // Admission Date
            row2.createCell(colIndex++).setCellValue("Jane Smith");                  // Full Name
            row2.createCell(colIndex++).setCellValue("456 Lake Road, Kandy");         // Address
            row2.createCell(colIndex++).setCellValue("987654321V");                  // NIC
            row2.createCell(colIndex++).setCellValue("Vishaka Vidyalaya");           // School
            row2.createCell(colIndex++).setCellValue("0773456789");                  // Phone No
            // Add subject values
            for (Subject subject : allSubjects) {
                if ("Chemistry".equalsIgnoreCase(subject.getName())) {
                    row2.createCell(colIndex++).setCellValue(1);
                } else {
                    row2.createCell(colIndex++).setCellValue(0);
                }
            }

            // Row 3: Bob Johnson - Multiple subjects student
            Row row3 = sheet.createRow(3);
            colIndex = 0;
            row3.createCell(colIndex++).setCellValue("BJ003");                       // Student ID Code
            row3.createCell(colIndex++).setCellValue("2025-03-10");                  // Admission Date
            row3.createCell(colIndex++).setCellValue("Bob Johnson");                 // Full Name
            row3.createCell(colIndex++).setCellValue("789 Hill View, Galle");        // Address
            row3.createCell(colIndex++).setCellValue("");                            // NIC (empty)
            row3.createCell(colIndex++).setCellValue("Richmond College");            // School
            row3.createCell(colIndex++).setCellValue("0114567890");                  // Phone No
            // Add subject values
            for (Subject subject : allSubjects) {
                if ("Mathematics".equalsIgnoreCase(subject.getName())
                        || "Chemistry".equalsIgnoreCase(subject.getName())
                        || "Physics".equalsIgnoreCase(subject.getName())) {
                    row3.createCell(colIndex++).setCellValue(1);
                } else {
                    row3.createCell(colIndex++).setCellValue(0);
                }
            }

            // Row 4: Sarah Wilson - Example with different combination
            Row row4 = sheet.createRow(4);
            colIndex = 0;
            row4.createCell(colIndex++).setCellValue("SW004");                       // Student ID Code
            row4.createCell(colIndex++).setCellValue("2025-04-05");                  // Admission Date
            row4.createCell(colIndex++).setCellValue("Sarah Wilson");                // Full Name
            row4.createCell(colIndex++).setCellValue("321 Beach Road, Negombo");     // Address
            row4.createCell(colIndex++).setCellValue("");                           // NIC (empty)
            row4.createCell(colIndex++).setCellValue("Holy Family Convent");         // School
            row4.createCell(colIndex++).setCellValue("0779876543");                  // Phone No
            // Add subject values
            for (Subject subject : allSubjects) {
                if ("Biology".equalsIgnoreCase(subject.getName()) || "Chemistry".equalsIgnoreCase(subject.getName())) {
                    row4.createCell(colIndex++).setCellValue(1);
                } else {
                    row4.createCell(colIndex++).setCellValue(0);
                }
            }

            // Auto-size all columns
            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            log.error("Error generating Excel template", e);
            throw new RuntimeException("Failed to generate Excel template", e);
        }
    }

    /**
     * Convert Student entity to DTO
     */
    private StudentDto studentToDto(Student student) {
        return new StudentDto(
                student.getId(),
                student.getStudentIdCode(),
                student.getIndexNumber(),
                student.getFullName(),
                student.getAddress(),
                student.getNic(),
                student.getSchool(),
                student.getAdmissionDate(),
                student.getParentPhone(),
                student.isActive(),
                new BatchDto(
                        student.getBatch().getId(),
                        student.getBatch().getBatchYear(),
                        student.getBatch().isDayBatch(),
                        student.getBatch().getDisplayName(),
                        0L, // We don't need exact count for import, so set to 0
                        student.getBatch().isArchived()
                ),
                student.getSubjects().stream()
                        .map(subject -> new SubjectDto(
                        subject.getId(),
                        subject.getName(),
                        0L // We don't need exact count for import, so set to 0
                ))
                        .collect(java.util.stream.Collectors.toSet())
        );
    }

    /**
     * Validates that the student ID code matches the batch's expected format.
     * For regular batches: Format should be [lastDigitOfYear][3digits] (e.g., 5001, 6002)
     * For day batches: Format should be D[lastDigitOfYear][3digits] (e.g., D5001, D6002)
     */
    private void validateStudentIdFormat(String studentId, Batch batch) {
        if (studentId == null || studentId.trim().isEmpty()) {
            throw new RuntimeException("Student ID Code cannot be empty");
        }

        studentId = studentId.trim();
        int batchYear = batch.getBatchYear();
        int lastDigit = batchYear % 10;
        String expectedPrefix = batch.isDayBatch() ? "D" + lastDigit : String.valueOf(lastDigit);

        // Check if student ID starts with the expected prefix
        if (!studentId.startsWith(expectedPrefix)) {
            String format = batch.isDayBatch() 
                ? "D" + lastDigit + "XXX (e.g., D" + lastDigit + "001)" 
                : lastDigit + "XXX (e.g., " + lastDigit + "001)";
            throw new RuntimeException(
                "Student ID Code must follow batch format. Expected format: " + format + 
                " for batch year " + batchYear + " (" + (batch.isDayBatch() ? "Day" : "Regular") + ")"
            );
        }

        // Extract and validate the sequence part (should be 3 digits)
        String sequencePart = studentId.substring(expectedPrefix.length());
        if (!sequencePart.matches("\\d{3}")) {
            String format = batch.isDayBatch() 
                ? "D" + lastDigit + "XXX (e.g., D" + lastDigit + "001)" 
                : lastDigit + "XXX (e.g., " + lastDigit + "001)";
            throw new RuntimeException(
                "Student ID Code must follow batch format. Expected format: " + format + 
                " - sequence must be exactly 3 digits"
            );
        }
    }
}
