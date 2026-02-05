package com.usa.attendancesystem.model;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Entity representing fee payments for students.
 */
@Entity
@Table(name = "fee_payments",
        uniqueConstraints = @UniqueConstraint(columnNames = {"student_id", "month", "year"}))
@Data
@NoArgsConstructor
public class FeePayment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @Column(name = "bill_number", nullable = false)
    private String billNumber;

    @Column(name = "month", nullable = false)
    private Integer month; // 1-12

    @Column(name = "year", nullable = false)
    private Integer year;

    @Column(name = "paid_at", nullable = false)
    private Instant paidAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    public FeePayment(Student student, String billNumber, Integer month, Integer year) {
        this.student = student;
        this.billNumber = billNumber;
        this.month = month;
        this.year = year;
        this.paidAt = Instant.now();
        this.createdAt = Instant.now();
    }
}
