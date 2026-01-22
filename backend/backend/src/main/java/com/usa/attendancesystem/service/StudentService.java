package com.usa.attendancesystem.service;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.usa.attendancesystem.dto.BatchDto;
import com.usa.attendancesystem.dto.CreateStudentRequest;
import com.usa.attendancesystem.dto.StudentDto;
import com.usa.attendancesystem.dto.SubjectDto;
import com.usa.attendancesystem.dto.UpdateStudentRequest;
import com.usa.attendancesystem.exception.ResourceNotFoundException;
import com.usa.attendancesystem.model.Batch;
import com.usa.attendancesystem.model.Student;
import com.usa.attendancesystem.model.Subject;
import com.usa.attendancesystem.repository.BatchRepository;
import com.usa.attendancesystem.repository.StudentRepository;
import com.usa.attendancesystem.repository.SubjectRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class StudentService {

    private final StudentRepository studentRepository;
    private final BatchRepository batchRepository;
    private final SubjectRepository subjectRepository;

    @Transactional
    public StudentDto createStudent(CreateStudentRequest request) {
        Batch batch = batchRepository.findById(request.batchId())
                .orElseThrow(() -> new ResourceNotFoundException("Batch not found with ID: " + request.batchId()));

        Set<Subject> subjects = new HashSet<>(subjectRepository.findAllById(request.subjectIds()));
        if (subjects.size() != request.subjectIds().size()) {
            throw new ResourceNotFoundException("One or more subjects not found.");
        }

        // Generate batch-based student ID
        String studentIdCode = getNextStudentIdForBatch(request.batchId());

        // Generate index number based on batch if not provided, or validate if provided
        String indexNumber = request.indexNumber();
        if (indexNumber == null || indexNumber.trim().isEmpty()) {
            indexNumber = getNextIndexNumberForBatch(request.batchId());
        } else {
            // Validate that the provided index number follows the correct format
            validateIndexNumberForBatch(indexNumber, batch);
        }

        // Use batch-based student ID and index number
        Student student = Student.builder()
                .studentIdCode(studentIdCode)
                .indexNumber(indexNumber)
                .fullName(request.fullName())
                .address(request.address())
                .nic(request.nic() != null && !request.nic().trim().isEmpty() ? request.nic().toUpperCase() : null) // Optional field
                .school(request.school())
                .admissionDate(request.admissionDate())
                .parentPhone(request.parentPhone())
                .batch(batch)
                .subjects(subjects)
                .isActive(true)
                .build();

        Student savedStudent = studentRepository.save(student);
        return mapToStudentDto(savedStudent);
    }

    /**
     * Validate that an index number follows the correct format for a batch
     */
    private void validateIndexNumberForBatch(String indexNumber, Batch batch) {
        try {
            int indexNum = Integer.parseInt(indexNumber);
            int lastDigit = batch.getBatchYear() % 10;
            int baseNumber = lastDigit * 1000;

            if (indexNum < baseNumber || indexNum >= baseNumber + 1000) {
                throw new IllegalArgumentException(
                        String.format("Index number %s is not valid for batch %d. Expected range: %d-%d",
                                indexNumber, batch.getBatchYear(), baseNumber + 1, baseNumber + 999));
            }

            // Check if index number already exists
            if (studentRepository.existsByIndexNumber(indexNumber)) {
                throw new IllegalArgumentException("Index number " + indexNumber + " already exists");
            }
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Index number must be a valid number");
        }
    }

    /**
     * Generates the next available index number in the format IDX001, IDX002,
     * etc.
     */
    private String generateNextIndexNumber() {
        List<Student> students = studentRepository.findAllOrderByIndexNumberDesc();

        if (students.isEmpty()) {
            return "IDX001";
        }

        // Find the highest numeric part from existing index numbers
        int maxNumber = 0;
        for (Student student : students) {
            String indexNumber = student.getIndexNumber();
            if (indexNumber.startsWith("IDX") && indexNumber.length() >= 6) {
                try {
                    String numericPart = indexNumber.substring(3);
                    int number = Integer.parseInt(numericPart);
                    maxNumber = Math.max(maxNumber, number);
                } catch (NumberFormatException e) {
                    // Skip invalid index numbers
                }
            }
        }

        // Generate next index number
        int nextNumber = maxNumber + 1;
        return String.format("IDX%03d", nextNumber);
    }

    /**
     * Generate next index number for a specific batch following the format:
     * Batch 2027 -> 7001, 7002, 7003... Batch 2028 -> 8001, 8002, 8003...
     */
    public String getNextIndexNumberForBatch(Integer batchId) {
        Batch batch = batchRepository.findById(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("Batch not found with ID: " + batchId));

        // Get the last digit of the batch year
        int lastDigit = batch.getBatchYear() % 10;
        int baseNumber = lastDigit * 1000;

        // Get existing students in this batch ordered by index number
        List<Student> studentsInBatch = studentRepository.findByBatchIdOrderByIndexNumberDesc(batchId);

        int nextSequence = 1; // Start from 1

        if (!studentsInBatch.isEmpty()) {
            // Find the highest sequence number for this batch
            for (Student student : studentsInBatch) {
                try {
                    int indexNum = Integer.parseInt(student.getIndexNumber());
                    if (indexNum >= baseNumber && indexNum < baseNumber + 1000) {
                        int sequence = indexNum - baseNumber;
                        nextSequence = Math.max(nextSequence, sequence + 1);
                    }
                } catch (NumberFormatException e) {
                    // Skip invalid index numbers
                }
            }
        }

        return String.valueOf(baseNumber + nextSequence);
    }

    /**
     * Public method to get the next available student ID code for frontend
     * display. This method is deprecated as student IDs are now batch-based.
     */
    @Deprecated
    public String getNextStudentIdCode() {
        return "Select batch first";
    }

    /**
     * Generates the next student ID based on batch year and student sequence.
     * Format: [last digit of year][sequence number] E.g., for batch 2026: 6001,
     * 6002, 6003... E.g., for batch 2025: 5001, 5002, 5003...
     */
    public String getNextStudentIdForBatch(Integer batchId) {
        // Get the batch
        Batch batch = batchRepository.findById(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("Batch not found with id: " + batchId));

        int batchYear = batch.getBatchYear();
        int lastDigit = batchYear % 10;
        String prefix = String.valueOf(lastDigit);

        // Find the highest student ID for this batch prefix across all students
        List<Student> allStudents = studentRepository.findAll();
        int maxSequence = 0;

        for (Student student : allStudents) {
            String studentId = student.getStudentIdCode();
            if (studentId != null && studentId.startsWith(prefix) && studentId.length() == 4) {
                try {
                    int sequence = Integer.parseInt(studentId.substring(1)); // Get last 3 digits
                    maxSequence = Math.max(maxSequence, sequence);
                } catch (NumberFormatException e) {
                    // Skip invalid format
                }
            }
        }

        // Generate next sequence number
        int nextSequence = maxSequence + 1;

        // Ensure the sequence number is at least 001 for the first student
        if (nextSequence < 1) {
            nextSequence = 1;
        }

        // Format: last digit + sequence (padded to 3 digits)
        return String.format("%d%03d", lastDigit, nextSequence);
    }

    /**
     * Generates the next available student ID code in the format YYYY001,
     * YYYY002, etc. where YYYY is the current year.
     */
    private String generateNextStudentIdCode() {
        int currentYear = LocalDate.now().getYear();
        String yearPrefix = String.valueOf(currentYear);

        List<Student> students = studentRepository.findAllOrderByStudentIdCodeDesc();

        if (students.isEmpty()) {
            return yearPrefix + "001";
        }

        // Find the highest numeric part from existing student ID codes for current year
        int maxNumber = 0;
        for (Student student : students) {
            String studentIdCode = student.getStudentIdCode();
            if (studentIdCode.startsWith(yearPrefix) && studentIdCode.length() == 7) {
                try {
                    String numericPart = studentIdCode.substring(4); // Get last 3 digits
                    int number = Integer.parseInt(numericPart);
                    maxNumber = Math.max(maxNumber, number);
                } catch (NumberFormatException e) {
                    // Skip invalid student ID codes
                }
            }
        }

        // Generate next student ID code
        int nextNumber = maxNumber + 1;
        return String.format("%s%03d", yearPrefix, nextNumber);
    }

    @Transactional(readOnly = true)
    public List<StudentDto> getFilteredStudents(Integer batchId, Integer subjectId) {
        return studentRepository.findActiveStudentsByBatchAndSubject(batchId, subjectId)
                .stream()
                .map(this::mapToStudentDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<StudentDto> getStudentsByBatch(Integer batchId) {
        return studentRepository.findActiveStudentsByBatch(batchId)
                .stream()
                .map(this::mapToStudentDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<StudentDto> getStudentsBySubject(Integer subjectId) {
        return studentRepository.findActiveStudentsBySubject(subjectId)
                .stream()
                .map(this::mapToStudentDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<StudentDto> getAllActiveStudents() {
        return studentRepository.findAll()
                .stream()
                .filter(Student::isActive)
                .map(this::mapToStudentDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public StudentDto getStudentById(UUID studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with ID: " + studentId));
        return mapToStudentDto(student);
    }

    @Transactional
    public StudentDto updateStudent(UUID studentId, UpdateStudentRequest request) {
        Student studentToUpdate = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with ID: " + studentId));

        Batch batch = batchRepository.findById(request.batchId())
                .orElseThrow(() -> new ResourceNotFoundException("Batch not found with ID: " + request.batchId()));

        Set<Subject> subjects = new HashSet<>(subjectRepository.findAllById(request.subjectIds()));
        if (subjects.size() != request.subjectIds().size()) {
            throw new ResourceNotFoundException("One or more subjects not found.");
        }

        // Update all editable fields
        studentToUpdate.setFullName(request.fullName());
        studentToUpdate.setAddress(request.address());
        studentToUpdate.setNic(request.nic() != null && !request.nic().trim().isEmpty() ? request.nic().toUpperCase() : null); // Optional field
        studentToUpdate.setSchool(request.school());
        studentToUpdate.setAdmissionDate(request.admissionDate());
        studentToUpdate.setParentPhone(request.parentPhone());
        studentToUpdate.setBatch(batch);
        studentToUpdate.setSubjects(subjects);

        Student updatedStudent = studentRepository.save(studentToUpdate);
        return mapToStudentDto(updatedStudent);
    }

    @Transactional
    public void deactivateStudent(UUID studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with ID: " + studentId));
        student.setActive(false);
        studentRepository.save(student);
    }

    @Transactional
    public void reactivateStudent(UUID studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with ID: " + studentId));
        student.setActive(true);
        studentRepository.save(student);
    }

    @Transactional(readOnly = true)
    public List<StudentDto> getAllArchivedStudents() {
        return studentRepository.findByIsActiveFalse()
                .stream()
                .map(this::mapToStudentDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteStudent(UUID studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with ID: " + studentId));

        // Note: In a real application, you might want to check if the student has
        // any attendance records before allowing deletion
        studentRepository.delete(student);
    }

    /**
     * Helper method to convert a Student Entity to a StudentDto. FIX: Changed
     * from 'private' to 'public' to allow other services (like
     * AttendanceService) to use it.
     */
    public StudentDto mapToStudentDto(Student student) {
        long batchStudentCount = studentRepository.countActiveStudentsByBatch(student.getBatch().getId());
        BatchDto batchDto = new BatchDto(student.getBatch().getId(), student.getBatch().getBatchYear(), batchStudentCount);
        Set<SubjectDto> subjectDtos = student.getSubjects().stream()
                .map(subject -> {
                    Long studentCount = studentRepository.countActiveStudentsBySubject(subject.getId());
                    return new SubjectDto(subject.getId(), subject.getName(), studentCount);
                })
                .collect(Collectors.toSet());

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
                batchDto,
                subjectDtos
        );
    }
}
