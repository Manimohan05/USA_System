package com.usa.attendancesystem.config;

import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.usa.attendancesystem.model.Admin;
import com.usa.attendancesystem.model.ERole;
import com.usa.attendancesystem.model.Role;
import com.usa.attendancesystem.repository.AdminRepository;
import com.usa.attendancesystem.repository.RoleRepository;

@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final AdminRepository adminRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(AdminRepository adminRepository,
            RoleRepository roleRepository,
            PasswordEncoder passwordEncoder) {
        this.adminRepository = adminRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) throws Exception {
        initializeDefaultAdmin();
    }

    private void initializeDefaultAdmin() {
        // Check if old admin user exists and update it (migration from old credentials)
        Optional<Admin> existingAdmin = adminRepository.findByUsername("admin");
        if (existingAdmin.isPresent()) {
            Admin oldAdmin = existingAdmin.get();
            log.info("Updating existing admin user credentials during migration");

            // Update username and password
            oldAdmin.setUsername("USA Admin");
            oldAdmin.setPassword(passwordEncoder.encode("USA29#12MSK"));

            adminRepository.save(oldAdmin);

            log.info("=".repeat(50));
            log.info("ADMIN USER CREDENTIALS UPDATED SUCCESSFULLY!");
            log.info("Username: USA Admin");
            log.info("Password: USA29#12MSK");
            log.info("PLEASE CHANGE THE PASSWORD AFTER FIRST LOGIN!");
            log.info("=".repeat(50));
            return;
        }

        // Check if new admin already exists
        if (adminRepository.existsByUsername("USA Admin")) {
            log.info("Default admin user already exists");
            return;
        }

        // Find the SUPER_ADMIN role
        Role superAdminRole = roleRepository.findByName(ERole.ROLE_SUPER_ADMIN)
                .orElseThrow(() -> new RuntimeException("ROLE_SUPER_ADMIN not found in database"));

        // Create default admin user
        Admin defaultAdmin = new Admin(
                "USA Admin",
                passwordEncoder.encode("USA29#12MSK"), // Default password
                superAdminRole
        );

        adminRepository.save(defaultAdmin);

        log.info("=".repeat(50));
        log.info("DEFAULT ADMIN USER CREATED SUCCESSFULLY!");
        log.info("Username: USA Admin");
        log.info("Password: USA29#12MSK");
        log.info("PLEASE CHANGE THE PASSWORD AFTER FIRST LOGIN!");
        log.info("=".repeat(50));
    }
}
