package com.usa.attendancesystem.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.usa.attendancesystem.model.FeeExemption;
import com.usa.attendancesystem.model.FeeExemptionType;

@Repository
public interface FeeExemptionRepository extends JpaRepository<FeeExemption, UUID> {

    @Query("SELECT fe FROM FeeExemption fe JOIN FETCH fe.student s LEFT JOIN FETCH fe.subjects WHERE s.id = :studentId")
    Optional<FeeExemption> findByStudentId(@Param("studentId") UUID studentId);

    @Query("SELECT CASE WHEN COUNT(fe) > 0 THEN true ELSE false END FROM FeeExemption fe WHERE fe.student.id = :studentId AND fe.exemptionType = :exemptionType AND fe.appliesToAllSubjects = true")
    boolean existsByStudentIdAndExemptionTypeAndAppliesToAllSubjects(@Param("studentId") UUID studentId, @Param("exemptionType") FeeExemptionType exemptionType);

    @Query("SELECT DISTINCT fe FROM FeeExemption fe JOIN FETCH fe.student s LEFT JOIN FETCH fe.subjects ORDER BY s.studentIdCode")
    List<FeeExemption> findAllWithStudents();

    @Query("SELECT DISTINCT fe FROM FeeExemption fe JOIN FETCH fe.student s LEFT JOIN FETCH fe.subjects WHERE s.id IN :studentIds")
    List<FeeExemption> findByStudentIdIn(@Param("studentIds") List<UUID> studentIds);

    /**
     * Deletes all fee exemptions for students in a specific batch.
     * Used for batch permanent deletion.
     * First clears the join table, then deletes the exemptions.
     */
    @Modifying
    @Query(value = "DELETE FROM fee_exemption_subjects WHERE exemption_id IN (SELECT fe.id FROM fee_exemptions fe JOIN students s ON fe.student_id = s.id WHERE s.batch_id = :batchId)", nativeQuery = true)
    void deleteExemptionSubjectsByBatchId(@Param("batchId") Integer batchId);

    @Modifying
    @Query(value = "DELETE FROM fee_exemptions fe USING students s WHERE fe.student_id = s.id AND s.batch_id = :batchId", nativeQuery = true)
    void deleteByBatchId(@Param("batchId") Integer batchId);
}
