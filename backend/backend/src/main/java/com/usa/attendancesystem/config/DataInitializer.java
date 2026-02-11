package com.usa.attendancesystem.config;

import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.usa.attendancesystem.model.Admin;
import com.usa.attendancesystem.model.Batch;
import com.usa.attendancesystem.model.ERole;
import com.usa.attendancesystem.model.Role;
import com.usa.attendancesystem.model.Subject;
import com.usa.attendancesystem.repository.AdminRepository;
import com.usa.attendancesystem.repository.BatchRepository;
import com.usa.attendancesystem.repository.RoleRepository;
import com.usa.attendancesystem.repository.SubjectRepository;

@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final AdminRepository adminRepository;
    private final RoleRepository roleRepository;
    private final BatchRepository batchRepository;
    private final SubjectRepository subjectRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(AdminRepository adminRepository,
            RoleRepository roleRepository,
            BatchRepository batchRepository,
            SubjectRepository subjectRepository,
            PasswordEncoder passwordEncoder) {
        this.adminRepository = adminRepository;
        this.roleRepository = roleRepository;
        this.batchRepository = batchRepository;
        this.subjectRepository = subjectRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) throws Exception {
        initializeDefaultAdmin();
        initializeSampleData();
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

    private void initializeSampleData() {
        // Initialize sample batches if none exist
        if (batchRepository.count() == 0) {
            log.info("Creating sample batches...");

            Batch batch2024 = new Batch(2024);
            batchRepository.save(batch2024);

            Batch batch2025 = new Batch(2025);
            batchRepository.save(batch2025);

            log.info("Sample batches created: 2024, 2025");
        }

        // Initialize sample subjects if none exist
        if (subjectRepository.count() == 0) {
            log.info("Creating sample subjects...");

            Subject math = new Subject("Mathematics");
            subjectRepository.save(math);

            Subject physics = new Subject("Physics");
            subjectRepository.save(physics);

            Subject chemistry = new Subject("Chemistry");
            subjectRepository.save(chemistry);

            Subject english = new Subject("English");
            subjectRepository.save(english);

            log.info("Sample subjects created: Mathematics, Physics, Chemistry, English");
        }
    }
}
