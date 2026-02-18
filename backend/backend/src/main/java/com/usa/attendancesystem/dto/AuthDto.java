package com.usa.attendancesystem.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class AuthDto {

    public record LoginRequest(
            @NotBlank String username,
            @NotBlank String password
    ) {}

    public record AuthResponse(
            String token
    ) {}

    public record ChangePasswordRequest(
            @NotBlank String currentPassword,
            @NotBlank
            @Size(min = 8, max = 100)
            @Pattern(
                    regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,100}$",
                    message = "Password must contain uppercase, lowercase, number, and special character"
            )
            String newPassword,
            @NotBlank String confirmNewPassword
    ) {}

    public record MessageResponse(
            String message
    ) {}

    public record ProfileResponse(
            String username,
            String profilePicture
    ) {}

    public record UpdateProfilePictureRequest(
            @NotBlank String profilePicture
    ) {}
}