package com.codearena.service;

import com.codearena.domain.User;
import com.codearena.dto.AuthDtos;
import com.codearena.exception.ConflictException;
import com.codearena.repository.UserRepository;
import com.codearena.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    @Transactional
    public AuthDtos.AuthResponse register(AuthDtos.RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new ConflictException("Email already registered");
        }
        if (userRepository.existsByUsername(request.username())) {
            throw new ConflictException("Username already taken");
        }

        User user = User.builder()
                .email(request.email())
                .username(request.username())
                .password(passwordEncoder.encode(request.password()))
                .role(User.Role.PARTICIPANT)
                .enabled(true)
                .build();

        user = userRepository.save(user);
        String token = jwtService.generateToken(user);
        return buildAuthResponse(token, user);
    }

    public AuthDtos.AuthResponse login(AuthDtos.LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email(), request.password())
        );

        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new RuntimeException("User not found"));

        String token = jwtService.generateToken(user);
        return buildAuthResponse(token, user);
    }

    public AuthDtos.UserDto me(User user) {
        return toUserDto(user);
    }

    private AuthDtos.AuthResponse buildAuthResponse(String token, User user) {
        return new AuthDtos.AuthResponse(token, "Bearer", toUserDto(user));
    }

    private AuthDtos.UserDto toUserDto(User user) {
        return new AuthDtos.UserDto(
                user.getId(),
                user.getEmail(),
                user.getActualUsername(),
                user.getRole().name(),
                user.getCreatedAt().toString()
        );
    }
}
