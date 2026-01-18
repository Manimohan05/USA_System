package com.usa.attendancesystem.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Entity
@Table(name = "admins")
public class Admin {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(unique = true, nullable = false, length = 50)
    private String username;

    @Column(name = "password_hash", nullable = false)
    private String password; // Field name is 'password' for Spring Security, maps to 'password_hash'

    @ManyToOne(fetch = FetchType.EAGER) // Eager fetch role as it's always needed for security
    @JoinColumn(name = "role_id", nullable = false)
    private Role role;

    public Admin(String username, String password, Role role) {
        this.username = username;
        this.password = password;
        this.role = role;
    }
}