package com.usa.attendancesystem.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.usa.attendancesystem.model.FeeExemption;

@Repository
public interface FeeExemptionRepository extends JpaRepository<FeeExemption, UUID> {

    @Query("SELECT fe FROM FeeExemption fe JOIN FETCH fe.student s WHERE s.id = :studentId")
    Optional<FeeExemption> findByStudentId(@Param("studentId") UUID studentId);

    @Query("SELECT fe FROM FeeExemption fe JOIN FETCH fe.student s ORDER BY s.studentIdCode")
    List<FeeExemption> findAllWithStudents();
}
