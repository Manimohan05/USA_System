package com.usa.attendancesystem.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Entity
@Table(name = "subjects")
public class Subject {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(unique = true, nullable = false, length = 100)
    private String name;

    @Column(name = "is_archived", nullable = false)
    private boolean isArchived = false;

    public Subject(String name) {
        this.name = name;
        this.isArchived = false;
    }
}