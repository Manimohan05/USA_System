package com.usa.attendancesystem.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.usa.attendancesystem.dto.BatchDto;
import com.usa.attendancesystem.dto.CreateBatchRequest;
import com.usa.attendancesystem.dto.CreateSubjectRequest;
import com.usa.attendancesystem.dto.SubjectDto;
import com.usa.attendancesystem.exception.DuplicateResourceException;
import com.usa.attendancesystem.exception.ResourceNotFoundException;
import com.usa.attendancesystem.model.Batch;
import com.usa.attendancesystem.model.Subject;
import com.usa.attendancesystem.repository.AttendanceSessionRepository;
import com.usa.attendancesystem.repository.BatchRepository;
import com.usa.attendancesystem.repository.StudentRepository;
import com.usa.attendancesystem.repository.SubjectRepository;
import com.usa.attendancesystem.repository.AttendanceRecordRepository;
import com.usa.attendancesystem.repository.FeeRecordRepository;
import com.usa.attendancesystem.repository.FeePaymentRepository;
import com.usa.attendancesystem.repository.FeeExemptionRepository;

import lombok.RequiredArgsConstructor;

/**
 * Service class containing business logic for managing Batches and Subjects.
 */
@Service
@RequiredArgsConstructor
public class InstituteManagementService {

    private final BatchRepository batchRepository;
    private final SubjectRepository subjectRepository;
    private final StudentRepository studentRepository;
    private final AttendanceSessionRepository attendanceSessionRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final FeeRecordRepository feeRecordRepository;
    private final FeePaymentRepository feePaymentRepository;
    private final FeeExemptionRepository feeExemptionRepository;

    // --- Batch Methods ---
    @Transactional
    public BatchDto createBatch(CreateBatchRequest request) {
        // Check if batch with same year and day batch flag already exists
        batchRepository.findByBatchYearAndIsDayBatch(request.batchYear(), request.isDayBatch()).ifPresent(b -> {
            String batchType = request.isDayBatch() ? "Day batch" : "Batch";
            throw new DuplicateResourceException(batchType + " with year " + request.batchYear() + " already exists.");
        });

        Batch newBatch = new Batch(request.batchYear(), request.isDayBatch());
        Batch savedBatch = batchRepository.save(newBatch);
        long studentCount = studentRepository.countActiveStudentsByBatch(savedBatch.getId());
        return new BatchDto(savedBatch.getId(), savedBatch.getBatchYear(), savedBatch.isDayBatch(),
                savedBatch.getDisplayName(), studentCount, savedBatch.isArchived());
    }

    @Transactional(readOnly = true)
    public List<BatchDto> getAllBatches() {
        return batchRepository.findByIsArchivedFalse().stream()
                .map(batch -> {
                    long studentCount = studentRepository.countActiveStudentsByBatch(batch.getId());
                    return new BatchDto(batch.getId(), batch.getBatchYear(), batch.isDayBatch(),
                            batch.getDisplayName(), studentCount, batch.isArchived());
                })
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<BatchDto> getArchivedBatches() {
        return batchRepository.findByIsArchivedTrue().stream()
                .map(batch -> {
                    long studentCount = studentRepository.countActiveStudentsByBatch(batch.getId());
                    return new BatchDto(batch.getId(), batch.getBatchYear(), batch.isDayBatch(),
                            batch.getDisplayName(), studentCount, batch.isArchived());
                })
                .collect(Collectors.toList());
    }

    @Transactional
    public BatchDto archiveBatch(Integer batchId) {
        Batch batch = batchRepository.findById(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("Batch not found with ID: " + batchId));

        if (attendanceSessionRepository.existsByBatch_IdAndIsActiveTrue(batchId)) {
            throw new IllegalStateException(
                "Cannot archive this batch because an active attendance session exists. End the session first.");
        }
        
        batch.setArchived(true);
        Batch archivedBatch = batchRepository.save(batch);
        long studentCount = studentRepository.countActiveStudentsByBatch(archivedBatch.getId());
        return new BatchDto(archivedBatch.getId(), archivedBatch.getBatchYear(), archivedBatch.isDayBatch(),
                archivedBatch.getDisplayName(), studentCount, archivedBatch.isArchived());
    }

    @Transactional
    public BatchDto recoverBatch(Integer batchId) {
        Batch batch = batchRepository.findById(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("Batch not found with ID: " + batchId));
        
        batch.setArchived(false);
        Batch recoveredBatch = batchRepository.save(batch);
        long studentCount = studentRepository.countActiveStudentsByBatch(recoveredBatch.getId());
        return new BatchDto(recoveredBatch.getId(), recoveredBatch.getBatchYear(), recoveredBatch.isDayBatch(),
                recoveredBatch.getDisplayName(), studentCount, recoveredBatch.isArchived());
    }

    @Transactional
    public void permanentlyDeleteBatch(Integer batchId) {
        Batch batch = batchRepository.findById(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("Batch not found with ID: " + batchId));

        if (attendanceSessionRepository.existsByBatch_IdAndIsActiveTrue(batchId)) {
            throw new IllegalStateException(
                    "Cannot permanently delete this batch because an active attendance session exists. End the session first.");
        }

        if (!batch.isArchived()) {
            throw new IllegalStateException("Only archived batches can be permanently deleted. Archive the batch first.");
        }

        // Delete in correct order to avoid foreign key constraint issues:
        // 1. Delete all fee exemption-subject join table entries first
        feeExemptionRepository.deleteExemptionSubjectsByBatchId(batchId);

        // 2. Delete all attendance records for students in this batch
        attendanceRecordRepository.deleteByBatchId(batchId);

        // 3. Delete all fee payments for students in this batch
        feePaymentRepository.deleteByBatchId(batchId);

        // 4. Delete all fee records for students in this batch
        feeRecordRepository.deleteByBatchId(batchId);

        // 5. Delete all fee exemptions for students in this batch
        feeExemptionRepository.deleteByBatchId(batchId);

        // 6. Delete all students in this batch (cascades to any remaining related records)
        studentRepository.deleteByBatchId(batchId);

        // 7. Finally, delete the batch itself
        batchRepository.delete(batch);
    }

    // --- Subject Methods ---
    @Transactional
    public SubjectDto createSubject(CreateSubjectRequest request) {
        subjectRepository.findByName(request.name()).ifPresent(s -> {
            throw new DuplicateResourceException("Subject with name '" + request.name() + "' already exists.");
        });

        Subject newSubject = new Subject(request.name());
        Subject savedSubject = subjectRepository.save(newSubject);
        Long studentCount = studentRepository.countActiveStudentsBySubject(savedSubject.getId());
        return new SubjectDto(savedSubject.getId(), savedSubject.getName(), studentCount, savedSubject.isArchived());
    }

    @Transactional(readOnly = true)
    public List<SubjectDto> getAllSubjects() {
        return subjectRepository.findByIsArchivedFalse().stream()
                .map(subject -> {
                    Long studentCount = studentRepository.countActiveStudentsBySubject(subject.getId());
                    return new SubjectDto(subject.getId(), subject.getName(), studentCount, subject.isArchived());
                })
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SubjectDto> getArchivedSubjects() {
        return subjectRepository.findByIsArchivedTrue().stream()
                .map(subject -> {
                    Long studentCount = studentRepository.countActiveStudentsBySubject(subject.getId());
                    return new SubjectDto(subject.getId(), subject.getName(), studentCount, subject.isArchived());
                })
                .collect(Collectors.toList());
    }

    @Transactional
    public SubjectDto updateSubject(Integer subjectId, CreateSubjectRequest request) {
        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> new ResourceNotFoundException("Subject not found with ID: " + subjectId));

        // Check if another subject with the same name already exists (excluding current subject)
        subjectRepository.findByName(request.name()).ifPresent(existingSubject -> {
            if (!existingSubject.getId().equals(subjectId)) {
                throw new DuplicateResourceException("Subject with name '" + request.name() + "' already exists.");
            }
        });

        subject.setName(request.name());
        Subject updatedSubject = subjectRepository.save(subject);
        Long studentCount = studentRepository.countActiveStudentsBySubject(updatedSubject.getId());
        return new SubjectDto(updatedSubject.getId(), updatedSubject.getName(), studentCount, updatedSubject.isArchived());
    }

    @Transactional
    public SubjectDto archiveSubject(Integer subjectId) {
        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> new ResourceNotFoundException("Subject not found with ID: " + subjectId));

        if (attendanceSessionRepository.existsBySubject_IdAndIsActiveTrue(subjectId)) {
            throw new IllegalStateException(
                "Cannot archive this subject because an active attendance session exists. End the session first.");
        }
        
        subject.setArchived(true);
        Subject archivedSubject = subjectRepository.save(subject);
        Long studentCount = studentRepository.countActiveStudentsBySubject(archivedSubject.getId());
        return new SubjectDto(archivedSubject.getId(), archivedSubject.getName(), studentCount, archivedSubject.isArchived());
    }

    @Transactional
    public SubjectDto recoverSubject(Integer subjectId) {
        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> new ResourceNotFoundException("Subject not found with ID: " + subjectId));
        
        subject.setArchived(false);
        Subject recoveredSubject = subjectRepository.save(subject);
        Long studentCount = studentRepository.countActiveStudentsBySubject(recoveredSubject.getId());
        return new SubjectDto(recoveredSubject.getId(), recoveredSubject.getName(), studentCount, recoveredSubject.isArchived());
    }

    @Transactional
    public void permanentlyDeleteSubject(Integer subjectId) {
        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> new ResourceNotFoundException("Subject not found with ID: " + subjectId));

        if (attendanceSessionRepository.existsBySubject_IdAndIsActiveTrue(subjectId)) {
            throw new IllegalStateException(
                    "Cannot permanently delete this subject because an active attendance session exists. End the session first.");
        }

        if (!subject.isArchived()) {
            throw new IllegalStateException("Only archived subjects can be permanently deleted. Archive the subject first.");
        }

        // Students are NOT deleted when a subject is deleted due to @ManyToMany relationship
        // The join table entries will be removed automatically by JPA cascade behavior
        subjectRepository.delete(subject);
    }

    @Transactional
    public void deleteSubject(Integer subjectId) {
        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> new ResourceNotFoundException("Subject not found with ID: " + subjectId));

        if (attendanceSessionRepository.existsBySubject_IdAndIsActiveTrue(subjectId)) {
            throw new IllegalStateException(
                "Cannot archive this subject because an active attendance session exists. End the session first.");
        }

        // Archive the subject instead of permanently deleting it
        subject.setArchived(true);
        subjectRepository.save(subject);
    }

    @Transactional
    public BatchDto updateBatch(Integer batchId, CreateBatchRequest request) {
        Batch batch = batchRepository.findById(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("Batch not found with ID: " + batchId));

        // Check if another batch with the same year already exists (excluding current batch)
        batchRepository.findByBatchYear(request.batchYear()).ifPresent(existingBatch -> {
            if (!existingBatch.getId().equals(batchId)) {
                throw new DuplicateResourceException("Batch with year " + request.batchYear() + " already exists.");
            }
        });

        batch.setBatchYear(request.batchYear());
        Batch updatedBatch = batchRepository.save(batch);
        long studentCount = studentRepository.countActiveStudentsByBatch(updatedBatch.getId());
        return new BatchDto(updatedBatch.getId(), updatedBatch.getBatchYear(), updatedBatch.isDayBatch(), updatedBatch.getDisplayName(), studentCount, updatedBatch.isArchived());
    }

    @Transactional
    public void deleteBatch(Integer batchId) {
        Batch batch = batchRepository.findById(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("Batch not found with ID: " + batchId));

        if (attendanceSessionRepository.existsByBatch_IdAndIsActiveTrue(batchId)) {
            throw new IllegalStateException(
                "Cannot archive this batch because an active attendance session exists. End the session first.");
        }

        // Archive the batch instead of permanently deleting it
        batch.setArchived(true);
        batchRepository.save(batch);
    }
}
