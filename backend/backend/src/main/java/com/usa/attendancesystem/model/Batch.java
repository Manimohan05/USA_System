package com.usa.attendancesystem.model;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.HashSet;
import java.util.Set;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "batches", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"batch_year", "is_day_batch"})
})
public class Batch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "batch_year", nullable = false)
    private int batchYear;

    @Column(name = "is_day_batch", nullable = false)
    private boolean isDayBatch = false;

    @Column(name = "is_archived", nullable = false)
    private boolean isArchived = false;

    @OneToMany(mappedBy = "batch", fetch = FetchType.LAZY)
    @Builder.Default
    private Set<Student> students = new HashSet<>();

    public Batch(int batchYear) {
        this.batchYear = batchYear;
        this.isDayBatch = false;
    }

    public Batch(int batchYear, boolean isDayBatch) {
        this.batchYear = batchYear;
        this.isDayBatch = isDayBatch;
    }

    // Helper method to get display name
    public String getDisplayName() {
        return isDayBatch ? batchYear + " Day" : String.valueOf(batchYear);
    }
}
