package com.usa.attendancesystem.model;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "fee_exemptions",
        uniqueConstraints = @UniqueConstraint(columnNames = {"student_id"}))
@Data
@NoArgsConstructor
public class FeeExemption {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @Enumerated(EnumType.STRING)
    @Column(name = "exemption_type", nullable = false)
    private FeeExemptionType exemptionType;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    public FeeExemption(Student student, FeeExemptionType exemptionType) {
        this.student = student;
        this.exemptionType = exemptionType;
        this.createdAt = Instant.now();
    }
}
