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
import com.usa.attendancesystem.repository.BatchRepository;
import com.usa.attendancesystem.repository.StudentRepository;
import com.usa.attendancesystem.repository.SubjectRepository;

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

        if (!batch.isArchived()) {
            throw new IllegalStateException("Only archived batches can be permanently deleted. Archive the batch first.");
        }

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
        return new SubjectDto(savedSubject.getId(), savedSubject.getName(), studentCount);
    }

    @Transactional(readOnly = true)
    public List<SubjectDto> getAllSubjects() {
        return subjectRepository.findAll().stream()
                .map(subject -> {
                    Long studentCount = studentRepository.countActiveStudentsBySubject(subject.getId());
                    return new SubjectDto(subject.getId(), subject.getName(), studentCount);
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
        return new SubjectDto(updatedSubject.getId(), updatedSubject.getName(), studentCount);
    }

    @Transactional
    public void deleteSubject(Integer subjectId) {
        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> new ResourceNotFoundException("Subject not found with ID: " + subjectId));

        // Note: In a real application, you might want to check if the subject is being used
        // by any students or in any attendance records before allowing deletion
        subjectRepository.delete(subject);
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

        // Archive the batch instead of permanently deleting it
        batch.setArchived(true);
        batchRepository.save(batch);
    }
}
