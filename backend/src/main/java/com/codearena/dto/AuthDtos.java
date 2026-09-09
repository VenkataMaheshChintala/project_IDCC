package com.codearena.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public sealed interface AuthDtos {

    record RegisterRequest(
            @NotBlank @Email String email,
            @NotBlank @Size(min = 3, max = 30)
            @Pattern(regexp = "^[a-zA-Z0-9_]+$", message = "Username can only contain letters, numbers, and underscores")
            String username,
            @NotBlank @Size(min = 8, max = 100) String password
    ) implements AuthDtos {}

    record LoginRequest(
            @NotBlank @Email String email,
            @NotBlank String password
    ) implements AuthDtos {}

    record AuthResponse(
            String token,
            String tokenType,
            UserDto user
    ) implements AuthDtos {}

    record UserDto(
            Long id,
            String email,
            String username,
            String role,
            String createdAt
    ) implements AuthDtos {}
}
