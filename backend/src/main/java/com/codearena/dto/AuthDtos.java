package com.codearena.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public sealed interface AuthDtos {

    record RegisterRequest(
            @NotBlank @Size(min = 3, max = 30) String teamName,
            @NotBlank String student1Name,
            String student2Name,
            @NotBlank String student1Rollno,
            String student2Rollno,
            @NotBlank String phoneNumber,
            @NotBlank @Size(min = 8, max = 100) String password
    ) implements AuthDtos {}

    record LoginRequest(
            @NotBlank String teamName,
            @NotBlank String password
    ) implements AuthDtos {}

    record AuthResponse(
            String token,
            String tokenType,
            UserDto user
    ) implements AuthDtos {}

    record UserDto(
            Long id,
            String teamName,
            String role,
            String createdAt
    ) implements AuthDtos {}
}
