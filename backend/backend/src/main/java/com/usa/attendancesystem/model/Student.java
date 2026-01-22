package com.usa.attendancesystem.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "students")
public class Student {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "student_id_code", unique = true, nullable = false, length = 50)
    private String studentIdCode;

    @Column(name = "index_number", unique = true, nullable = false, length = 10)
    private String indexNumber;

    @Column(name = "full_name", nullable = false)
    private String fullName;
    
    @Column(name = "address", nullable = false, length = 500)
    private String address;
    
    @Column(name = "nic", length = 15)
    private String nic; // Optional
    
    @Column(name = "school", nullable = false)
    private String school;
    
    @Column(name = "admission_date", nullable = false)
    private LocalDate admissionDate;

    @Column(name = "parent_phone", nullable = false, length = 20)
    private String parentPhone;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean isActive = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "batch_id", nullable = false)
    private Batch batch;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "student_subjects",
            joinColumns = @JoinColumn(name = "student_id"),
            inverseJoinColumns = @JoinColumn(name = "subject_id")
    )
    @Builder.Default
    private Set<Subject> subjects = new HashSet<>();
}
