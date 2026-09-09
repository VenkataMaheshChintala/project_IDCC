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
        if (userRepository.existsByUsername(request.teamName())) {
            throw new ConflictException("Team name already taken");
        }

        User user = User.builder()
                .username(request.teamName())
                .student1Name(request.student1Name())
                .student2Name(request.student2Name())
                .student1Rollno(request.student1Rollno())
                .student2Rollno(request.student2Rollno())
                .phoneNumber(request.phoneNumber())
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
                new UsernamePasswordAuthenticationToken(request.teamName(), request.password())
        );

        User user = userRepository.findByUsername(request.teamName())
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
                user.getUsername(),
                user.getRole().name(),
                user.getCreatedAt().toString()
        );
    }
}
