package com.taskflow.identity.service;

import com.taskflow.common.exception.AppException;
import com.taskflow.identity.dto.UpdateProfileRequest;
import com.taskflow.identity.dto.UserProfileResponse;
import com.taskflow.identity.entity.User;
import com.taskflow.identity.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public UserProfileResponse getProfile(UUID userId) {
        User user = findUserOrThrow(userId);
        return mapToProfileResponse(user);
    }

    @Transactional
    public UserProfileResponse updateProfile(UUID userId, UpdateProfileRequest request) {
        User user = findUserOrThrow(userId);

        if (request.getFirstName() != null) user.setFirstName(request.getFirstName().trim());
        if (request.getLastName() != null) user.setLastName(request.getLastName().trim());
        if (request.getDisplayName() != null) user.setDisplayName(request.getDisplayName().trim());
        if (request.getBio() != null) user.setBio(request.getBio());
        if (request.getJobTitle() != null) user.setJobTitle(request.getJobTitle());
        if (request.getTimezone() != null) user.setTimezone(request.getTimezone());
        if (request.getLanguage() != null) user.setLanguage(request.getLanguage());
        if (request.getDepartment() != null) user.setDepartment(request.getDepartment());
        if (request.getAvailability() != null) user.setAvailability(request.getAvailability());

        user = userRepository.save(user);
        log.info("Profile updated for user: {}", userId);
        return mapToProfileResponse(user);
    }

    @Transactional
    public void changePassword(UUID userId, String currentPassword, String newPassword) {
        User user = findUserOrThrow(userId);

        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw AppException.badRequest("INVALID_PASSWORD", "Current password is incorrect");
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        log.info("Password changed for user: {}", userId);
    }

    private User findUserOrThrow(UUID userId) {
        return userRepository.findByIdAndDeletedFalse(userId)
                .orElseThrow(() -> AppException.notFound("User", userId));
    }

    private UserProfileResponse mapToProfileResponse(User user) {
        return UserProfileResponse.builder()
                .id(user.getId().toString())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .displayName(user.getDisplayName())
                .avatarUrl(user.getAvatarUrl())
                .bio(user.getBio())
                .jobTitle(user.getJobTitle())
                .timezone(user.getTimezone())
                .language(user.getLanguage())
                .status(user.getStatus())
                .availability(user.getAvailability())
                .department(user.getDepartment())
                .emailVerified(user.isEmailVerified())
                .mfaEnabled(user.isMfaEnabled())
                .lastLoginAt(user.getLastLoginAt())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
