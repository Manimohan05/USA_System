package com.usa.attendancesystem.controller;

import com.usa.attendancesystem.config.security.JwtUtil;
import com.usa.attendancesystem.dto.AuthDto;
import com.usa.attendancesystem.model.Admin;
import com.usa.attendancesystem.repository.AdminRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.GetMapping;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserDetailsService userDetailsService;
    private final JwtUtil jwtUtil;
    private final AdminRepository adminRepository;
    private final PasswordEncoder passwordEncoder;

    @PostMapping("/login")
    public ResponseEntity<AuthDto.AuthResponse> login(@Valid @RequestBody AuthDto.LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.username(), request.password())
        );

        final UserDetails userDetails = userDetailsService.loadUserByUsername(request.username());
        final String token = jwtUtil.generateToken(userDetails);

        return ResponseEntity.ok(new AuthDto.AuthResponse(token));
    }

    @PostMapping("/change-password")
    public ResponseEntity<AuthDto.MessageResponse> changePassword(
            @Valid @RequestBody AuthDto.ChangePasswordRequest request,
            Authentication authentication
    ) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new AuthDto.MessageResponse("Authentication required"));
        }

        if (!request.newPassword().equals(request.confirmNewPassword())) {
            return ResponseEntity.badRequest()
                    .body(new AuthDto.MessageResponse("New password and confirmation do not match"));
        }

        Admin admin = adminRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new IllegalArgumentException("Admin user not found"));

        if (!passwordEncoder.matches(request.currentPassword(), admin.getPassword())) {
            return ResponseEntity.badRequest()
                    .body(new AuthDto.MessageResponse("Current password is incorrect"));
        }

        admin.setPassword(passwordEncoder.encode(request.newPassword()));
        adminRepository.save(admin);

        return ResponseEntity.ok(new AuthDto.MessageResponse("Password updated successfully"));
    }

    @GetMapping("/profile")
    public ResponseEntity<AuthDto.ProfileResponse> getProfile(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Admin admin = adminRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new IllegalArgumentException("Admin user not found"));

        return ResponseEntity.ok(new AuthDto.ProfileResponse(admin.getUsername(), admin.getProfilePicture()));
    }

    @PutMapping("/profile-picture")
    public ResponseEntity<AuthDto.MessageResponse> updateProfilePicture(
            @Valid @RequestBody AuthDto.UpdateProfilePictureRequest request,
            Authentication authentication
    ) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new AuthDto.MessageResponse("Authentication required"));
        }

        Admin admin = adminRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new IllegalArgumentException("Admin user not found"));

        admin.setProfilePicture(request.profilePicture());
        adminRepository.save(admin);

        return ResponseEntity.ok(new AuthDto.MessageResponse("Profile picture updated successfully"));
    }
}