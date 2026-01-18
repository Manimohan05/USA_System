package com.usa.attendancesystem.service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.Reader;
import java.io.StringWriter;
import java.nio.charset.StandardCharsets;
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

import com.usa.attendancesystem.dto.CsvImportResultDto;
import com.usa.attendancesystem.dto.StudentCsvImportRequest;
import com.usa.attendancesystem.dto.StudentDto;
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

    // Dynamic headers - will be generated based on available subjects
    private String[] getCsvHeaders() {
        List<Subject> allSubjects = subjectRepository.findAll();
        List<String> headers = new ArrayList<>();
        headers.add("Full Name");
        headers.add("Parent Phone");
        headers.add("Student Phone");
        headers.add("Batch Year");

        // Add subject columns
        for (Subject subject : allSubjects) {
            headers.add(subject.getName());
        }

        return headers.toArray(new String[0]);
    }

    @Transactional
    public CsvImportResultDto importStudentsFromCsv(MultipartFile file) {
        log.info("Starting import process for file: {}", file.getOriginalFilename());

        String fileName = file.getOriginalFilename();
        if (fileName == null) {
            throw new IllegalArgumentException("File name cannot be null");
        }

        try {
            if (fileName.toLowerCase().endsWith(".csv")) {
                return importFromCsv(file);
            } else if (fileName.toLowerCase().endsWith(".xlsx") || fileName.toLowerCase().endsWith(".xls")) {
                return importFromExcel(file);
            } else {
                throw new IllegalArgumentException("Unsupported file format. Please use CSV or Excel files.");
            }
        } catch (Exception e) {
            log.error("Error processing file", e);
            throw new RuntimeException("Failed to process file: " + e.getMessage(), e);
        }
    }

    private CsvImportResultDto importFromCsv(MultipartFile file) {
        List<String> errors = new ArrayList<>();
        List<StudentDto> importedStudents = new ArrayList<>();
        int totalRows = 0;
        int successfulImports = 0;

        try (Reader reader = new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8); CSVParser csvParser = new CSVParser(reader, CSVFormat.DEFAULT.withFirstRecordAsHeader())) {

            List<CSVRecord> records = csvParser.getRecords();
            totalRows = records.size();

            log.info("Starting CSV import with {} records", totalRows);

            for (int i = 0; i < records.size(); i++) {
                CSVRecord record = records.get(i);
                int rowNumber = i + 2; // +2 because CSV rows start from 1 and we have a header

                try {
                    StudentCsvImportRequest studentRequest = parseRecord(record, rowNumber);
                    StudentDto createdStudent = createStudentFromCsv(studentRequest);
                    importedStudents.add(createdStudent);
                    successfulImports++;
                    log.debug("Successfully imported student: {}", studentRequest.fullName());
                } catch (Exception e) {
                    String error = String.format("Row %d: %s", rowNumber, e.getMessage());
                    errors.add(error);
                    log.warn("Failed to import student at row {}: {}", rowNumber, e.getMessage());
                }
            }

        } catch (IOException e) {
            String error = "Failed to read CSV file: " + e.getMessage();
            errors.add(error);
            log.error("CSV file reading error", e);
        }

        int failedImports = totalRows - successfulImports;
        log.info("CSV import completed: {} successful, {} failed out of {} total",
                successfulImports, failedImports, totalRows);

        return new CsvImportResultDto(
                totalRows,
                successfulImports,
                failedImports,
                errors,
                importedStudents
        );
    }

    private CsvImportResultDto importFromExcel(MultipartFile file) {
        List<String> errors = new ArrayList<>();
        List<StudentDto> importedStudents = new ArrayList<>();
        int totalRows = 0;
        int successfulImports = 0;

        try (Workbook workbook = createWorkbook(file)) {
            Sheet sheet = workbook.getSheetAt(0); // Use first sheet

            totalRows = sheet.getLastRowNum(); // Exclude header row

            if (totalRows <= 0) {
                throw new IllegalArgumentException("Excel file is empty or contains only headers");
            }

            log.info("Starting Excel import with {} records", totalRows);

            // Get headers from first row
            Row headerRow = sheet.getRow(0);
            List<String> headers = new ArrayList<>();
            for (Cell cell : headerRow) {
                headers.add(getCellValueAsString(cell));
            }

            // Process data rows
            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) {
                    continue;
                }

                int rowNumber = i + 1; // Excel row numbers start from 1

                try {
                    StudentCsvImportRequest studentRequest = parseExcelRow(row, headers, rowNumber);
                    StudentDto createdStudent = createStudentFromCsv(studentRequest);
                    importedStudents.add(createdStudent);
                    successfulImports++;
                    log.debug("Successfully imported student: {}", studentRequest.fullName());
                } catch (Exception e) {
                    String error = String.format("Row %d: %s", rowNumber, e.getMessage());
                    errors.add(error);
                    log.warn("Failed to import student at row {}: {}", rowNumber, e.getMessage());
                }
            }

        } catch (Exception e) {
            String error = "Failed to read Excel file: " + e.getMessage();
            errors.add(error);
            log.error("Excel file reading error", e);
        }

        int failedImports = totalRows - successfulImports;
        log.info("Excel import completed: {} successful, {} failed out of {} total",
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
            String fullName = getCellValueByHeader(row, headers, "Full Name");
            String parentPhone = getCellValueByHeader(row, headers, "Parent Phone");
            String studentPhone = getCellValueByHeaderOptional(row, headers, "Student Phone");
            String batchYearStr = getCellValueByHeader(row, headers, "Batch Year");

            // Validate and parse batch year
            Integer batchYear;
            try {
                batchYear = Integer.parseInt(batchYearStr);
            } catch (NumberFormatException e) {
                throw new IllegalArgumentException("Invalid batch year format: " + batchYearStr);
            }

            // Parse subjects from 1/0 columns
            List<Subject> allSubjects = subjectRepository.findAll();
            List<String> selectedSubjects = new ArrayList<>();

            for (Subject subject : allSubjects) {
                String subjectValue = getCellValueByHeaderOptional(row, headers, subject.getName());
                if ("1".equals(subjectValue) || "1.0".equals(subjectValue)) {
                    selectedSubjects.add(subject.getName());
                }
            }

            String subjectNames = String.join(",", selectedSubjects);

            return new StudentCsvImportRequest(
                    fullName.trim(),
                    parentPhone.trim().replaceAll("[^0-9]", ""), // Remove non-digits
                    studentPhone != null ? studentPhone.trim().replaceAll("[^0-9]", "") : null,
                    batchYear,
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
            String fullName = getFieldValue(record, "Full Name", rowNumber);
            String parentPhone = getFieldValue(record, "Parent Phone", rowNumber);
            String studentPhone = getOptionalFieldValue(record, "Student Phone");
            String batchYearStr = getFieldValue(record, "Batch Year", rowNumber);

            // Validate and parse batch year
            Integer batchYear;
            try {
                batchYear = Integer.parseInt(batchYearStr.trim());
            } catch (NumberFormatException e) {
                throw new IllegalArgumentException("Invalid batch year format: " + batchYearStr);
            }

            // Parse subjects from 1/0 columns
            List<Subject> allSubjects = subjectRepository.findAll();
            List<String> selectedSubjects = new ArrayList<>();

            for (Subject subject : allSubjects) {
                String subjectValue = getOptionalFieldValue(record, subject.getName());
                if ("1".equals(subjectValue)) {
                    selectedSubjects.add(subject.getName());
                }
            }

            String subjectNames = String.join(",", selectedSubjects);

            return new StudentCsvImportRequest(
                    fullName.trim(),
                    parentPhone.trim().replaceAll("[^0-9]", ""), // Remove non-digits
                    studentPhone != null ? studentPhone.trim().replaceAll("[^0-9]", "") : null,
                    batchYear,
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

    private StudentDto createStudentFromCsv(StudentCsvImportRequest request) {
        // Find or validate batch
        Batch batch = batchRepository.findByBatchYear(request.batchYear())
                .orElseThrow(() -> new ResourceNotFoundException(
                "Batch with year " + request.batchYear() + " not found"));

        // Parse and validate subjects
        Set<Subject> subjects = parseSubjects(request.subjectNames());

        // Auto-generate student ID code and index number
        String studentIdCode = generateNextStudentIdCode();
        String indexNumber = generateNextIndexNumber();

        // Create student
        Student student = Student.builder()
                .studentIdCode(studentIdCode)
                .indexNumber(indexNumber)
                .fullName(request.fullName())
                .parentPhone(request.parentPhone())
                .studentPhone(request.studentPhone())
                .batch(batch)
                .subjects(subjects)
                .isActive(true)
                .build();

        Student savedStudent = studentRepository.save(student);
        return studentService.mapToStudentDto(savedStudent);
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

    /**
     * Generate next student ID code for CSV import
     */
    private String generateNextStudentIdCode() {
        List<Student> students = studentRepository.findAllOrderByStudentIdCodeDesc();

        if (students.isEmpty()) {
            return "STU001";
        }

        int maxNumber = 0;
        for (Student student : students) {
            String studentIdCode = student.getStudentIdCode();
            if (studentIdCode.startsWith("STU") && studentIdCode.length() >= 6) {
                try {
                    String numericPart = studentIdCode.substring(3);
                    int number = Integer.parseInt(numericPart);
                    maxNumber = Math.max(maxNumber, number);
                } catch (NumberFormatException e) {
                    continue;
                }
            }
        }

        int nextNumber = maxNumber + 1;
        return String.format("STU%03d", nextNumber);
    }

    /**
     * Generate next index number for CSV import
     */
    private String generateNextIndexNumber() {
        List<Student> students = studentRepository.findAllOrderByIndexNumberDesc();

        if (students.isEmpty()) {
            return "IDX001";
        }

        int maxNumber = 0;
        for (Student student : students) {
            String indexNumber = student.getIndexNumber();
            if (indexNumber.startsWith("IDX") && indexNumber.length() >= 6) {
                try {
                    String numericPart = indexNumber.substring(3);
                    int number = Integer.parseInt(numericPart);
                    maxNumber = Math.max(maxNumber, number);
                } catch (NumberFormatException e) {
                    continue;
                }
            }
        }

        int nextNumber = maxNumber + 1;
        return String.format("IDX%03d", nextNumber);
    }

    public String generateCsvTemplate() {
        try (StringWriter writer = new StringWriter(); CSVPrinter csvPrinter = new CSVPrinter(writer, CSVFormat.DEFAULT.withHeader(getCsvHeaders()))) {

            List<Subject> allSubjects = subjectRepository.findAll();

            // Add sample data rows for reference
            List<Object> row1 = new ArrayList<>();
            row1.add("John Doe");           // Full Name
            row1.add("0771234567");        // Parent Phone (Sri Lankan format)
            row1.add("0712345678");        // Student Phone (Sri Lankan format)
            row1.add("2024");              // Batch Year

            // Add subject values (1 for Mathematics and Physics, 0 for others)
            for (Subject subject : allSubjects) {
                if ("Mathematics".equalsIgnoreCase(subject.getName())
                        || "Physics".equalsIgnoreCase(subject.getName())) {
                    row1.add("1");
                } else {
                    row1.add("0");
                }
            }
            csvPrinter.printRecord(row1.toArray());

            // Row 2: Jane Smith with Chemistry
            List<Object> row2 = new ArrayList<>();
            row2.add("Jane Smith");
            row2.add("0773456789");        // Sri Lankan format
            row2.add("");                   // Empty student phone
            row2.add("2024");

            for (Subject subject : allSubjects) {
                if ("Chemistry".equalsIgnoreCase(subject.getName())) {
                    row2.add("1");
                } else {
                    row2.add("0");
                }
            }
            csvPrinter.printRecord(row2.toArray());

            // Row 3: Bob Johnson with multiple subjects
            List<Object> row3 = new ArrayList<>();
            row3.add("Bob Johnson");
            row3.add("0114567890");        // Sri Lankan landline format
            row3.add("0779876543");        // Sri Lankan mobile format
            row3.add("2025");

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
                sheet.autoSizeColumn(i);
            }

            // Create sample data rows
            // Row 1: John Doe
            Row row1 = sheet.createRow(1);
            int colIndex = 0;
            row1.createCell(colIndex++).setCellValue("John Doe");
            row1.createCell(colIndex++).setCellValue("0771234567");  // Sri Lankan mobile
            row1.createCell(colIndex++).setCellValue("0712345678");  // Sri Lankan mobile
            row1.createCell(colIndex++).setCellValue(2024);

            for (Subject subject : allSubjects) {
                if ("Mathematics".equalsIgnoreCase(subject.getName())
                        || "Physics".equalsIgnoreCase(subject.getName())) {
                    row1.createCell(colIndex++).setCellValue(1);
                } else {
                    row1.createCell(colIndex++).setCellValue(0);
                }
            }

            // Row 2: Jane Smith
            Row row2 = sheet.createRow(2);
            colIndex = 0;
            row2.createCell(colIndex++).setCellValue("Jane Smith");
            row2.createCell(colIndex++).setCellValue("0773456789");  // Sri Lankan mobile
            row2.createCell(colIndex++).setCellValue(""); // Empty student phone
            row2.createCell(colIndex++).setCellValue(2024);

            for (Subject subject : allSubjects) {
                if ("Chemistry".equalsIgnoreCase(subject.getName())) {
                    row2.createCell(colIndex++).setCellValue(1);
                } else {
                    row2.createCell(colIndex++).setCellValue(0);
                }
            }

            // Row 3: Bob Johnson
            Row row3 = sheet.createRow(3);
            colIndex = 0;
            row3.createCell(colIndex++).setCellValue("Bob Johnson");
            row3.createCell(colIndex++).setCellValue("0114567890");  // Sri Lankan landline
            row3.createCell(colIndex++).setCellValue("0779876543");  // Sri Lankan mobile
            row3.createCell(colIndex++).setCellValue(2025);

            for (Subject subject : allSubjects) {
                if ("Mathematics".equalsIgnoreCase(subject.getName())
                        || "Chemistry".equalsIgnoreCase(subject.getName())
                        || "Physics".equalsIgnoreCase(subject.getName())) {
                    row3.createCell(colIndex++).setCellValue(1);
                } else {
                    row3.createCell(colIndex++).setCellValue(0);
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
}
