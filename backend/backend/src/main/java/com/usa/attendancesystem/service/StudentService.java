package com.usa.attendancesystem.service;

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
        // Validate that studentIdCode is not already taken (optional validation)
        // Since frontend auto-fills with next available, this should not happen
        // but keeping for safety

        Batch batch = batchRepository.findById(request.batchId())
                .orElseThrow(() -> new ResourceNotFoundException("Batch not found with ID: " + request.batchId()));

        Set<Subject> subjects = new HashSet<>(subjectRepository.findAllById(request.subjectIds()));
        if (subjects.size() != request.subjectIds().size()) {
            throw new ResourceNotFoundException("One or more subjects not found.");
        }

        // Auto-generate index number, use studentIdCode from request
        String indexNumber = generateNextIndexNumber();

        Student student = Student.builder()
                .studentIdCode(request.studentIdCode())
                .indexNumber(indexNumber)
                .fullName(request.fullName())
                .parentPhone(request.parentPhone())
                .studentPhone(request.studentPhone())
                .batch(batch)
                .subjects(subjects)
                .isActive(true)
                .build();

        Student savedStudent = studentRepository.save(student);
        return mapToStudentDto(savedStudent);
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
     * Public method to get the next available student ID code for frontend
     * display.
     */
    public String getNextStudentIdCode() {
        return generateNextStudentIdCode();
    }

    /**
     * Generates the next available student ID code in the format STU001,
     * STU002, etc.
     */
    private String generateNextStudentIdCode() {
        List<Student> students = studentRepository.findAllOrderByStudentIdCodeDesc();

        if (students.isEmpty()) {
            return "STU001";
        }

        // Find the highest numeric part from existing student ID codes
        int maxNumber = 0;
        for (Student student : students) {
            String studentIdCode = student.getStudentIdCode();
            if (studentIdCode.startsWith("STU") && studentIdCode.length() >= 6) {
                try {
                    String numericPart = studentIdCode.substring(3);
                    int number = Integer.parseInt(numericPart);
                    maxNumber = Math.max(maxNumber, number);
                } catch (NumberFormatException e) {
                    // Skip invalid student ID codes
                }
            }
        }

        // Generate next student ID code
        int nextNumber = maxNumber + 1;
        return String.format("STU%03d", nextNumber);
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

        // Index number is auto-generated and should not be updated
        studentToUpdate.setFullName(request.fullName());
        studentToUpdate.setParentPhone(request.parentPhone());
        studentToUpdate.setStudentPhone(request.studentPhone());
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
                student.getParentPhone(),
                student.getStudentPhone(),
                student.isActive(),
                batchDto,
                subjectDtos
        );
    }
}
