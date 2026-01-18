package com.usa.attendancesystem.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Entity
@Table(name = "batches")
public class Batch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "batch_year", unique = true, nullable = false)
    private int batchYear;

    public Batch(int batchYear) {
        this.batchYear = batchYear;
    }
}