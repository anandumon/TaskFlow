package com.taskflow.identity.service;

import com.taskflow.common.config.RedisConfig;
import com.taskflow.common.event.EventPublisher;
import com.taskflow.common.exception.AppException;
import com.taskflow.common.security.JwtProvider;
import com.taskflow.identity.dto.*;
import com.taskflow.identity.entity.RefreshToken;
import com.taskflow.identity.entity.User;
import com.taskflow.identity.repository.RefreshTokenRepository;
import com.taskflow.identity.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;
    private final RedisTemplate<String, Object> redisTemplate;
    private final EventPublisher eventPublisher;
    private final EmailVerificationService emailVerificationService;
    private final ConcurrentHashMap<String, String> localTokenStore = new ConcurrentHashMap<>();

    public AuthService(UserRepository userRepository,
                       RefreshTokenRepository refreshTokenRepository,
                       PasswordEncoder passwordEncoder,
                       JwtProvider jwtProvider,
                       @Autowired(required = false) RedisTemplate<String, Object> redisTemplate,
                       EventPublisher eventPublisher,
                       EmailVerificationService emailVerificationService) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtProvider = jwtProvider;
        this.redisTemplate = redisTemplate;
        this.eventPublisher = eventPublisher;
        this.emailVerificationService = emailVerificationService;
    }

    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class PendingRegistration {
        private String email;
        private String passwordHash;
        private String firstName;
        private String lastName;
        private String displayName;
        private String timezone;
        private Instant createdAt;
    }

    private final java.util.Map<String, PendingRegistration> pendingRegistrations = new ConcurrentHashMap<>();

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = request.getEmail().toLowerCase().trim();
        if (userRepository.existsByEmailAndDeletedFalse(email)) {
            throw AppException.conflict("EMAIL_EXISTS", "An account with this email already exists");
        }

        if (request.getPassword() == null || request.getPassword().length() < 8) {
            throw AppException.badRequest("INVALID_PASSWORD", "Password must be at least 8 characters long");
        }

        User user = User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .firstName(request.getFirstName().trim())
                .lastName(request.getLastName().trim())
                .displayName(request.getFirstName().trim() + " " + request.getLastName().trim())
                .timezone(request.getTimezone() != null ? request.getTimezone() : "UTC")
                .authProvider("LOCAL")
                .status("ACTIVE")
                .emailVerified(true)
                .build();

        User savedUser = userRepository.save(user);

        // Dispatch confirmation link email to user's inbox
        emailVerificationService.sendPendingConfirmationEmail(email, savedUser.getFirstName());

        return AuthResponse.builder()
                .requiresVerification(false)
                .verificationMessage("Registration successful! You can now sign in.")
                .user(AuthResponse.UserResponse.builder()
                        .id(savedUser.getId().toString())
                        .email(savedUser.getEmail())
                        .firstName(savedUser.getFirstName())
                        .lastName(savedUser.getLastName())
                        .displayName(savedUser.getDisplayName())
                        .emailVerified(true)
                        .build())
                .build();
    }

    @Transactional
    public VerifyEmailResponse verifyEmailCode(VerifyEmailRequest request) {
        String otp = request.getEffectiveOtp();
        if (otp.isBlank()) {
            throw AppException.badRequest("INVALID_OTP", "6-digit verification code is required");
        }
        return emailVerificationService.verifyOtp(request.getEmail(), otp);
    }

    public ResendOtpResponse resendVerificationCode(String email) {
        String normalizedEmail = email != null ? email.toLowerCase().trim() : "";
        PendingRegistration pending = pendingRegistrations.get(normalizedEmail);
        if (pending != null) {
            emailVerificationService.sendPendingConfirmationEmail(normalizedEmail, pending.getFirstName());
            return ResendOtpResponse.builder()
                    .success(true)
                    .code("CONFIRMATION_RESENT")
                    .message("A new confirmation email has been sent to your inbox.")
                    .retryAfterSeconds(60)
                    .build();
        }
        return emailVerificationService.resendOtp(email);
    }

    @Transactional
    public VerifyEmailResponse confirmEmail(String email, String token) {
        if (email == null || email.isBlank()) {
            throw AppException.badRequest("EMAIL_REQUIRED", "Email is required for confirmation");
        }
        String normalizedEmail = email.toLowerCase().trim();

        // 1. If already saved in users table
        Optional<User> existingUserOpt = userRepository.findByEmailAndDeletedFalse(normalizedEmail);
        if (existingUserOpt.isPresent()) {
            User user = existingUserOpt.get();
            if (!user.isEmailVerified()) {
                user.setEmailVerified(true);
                user.setStatus("ACTIVE");
                userRepository.save(user);
            }
            return VerifyEmailResponse.builder()
                    .success(true)
                    .code("EMAIL_CONFIRMED")
                    .message("Email verified successfully! You can now sign in.")
                    .build();
        }

        // 2. Fetch from pending registrations and save user to users table ONLY now
        PendingRegistration pending = pendingRegistrations.get(normalizedEmail);
        if (pending == null) {
            log.warn("No pending registration found for email: {}", normalizedEmail);
            throw AppException.notFound("No pending signup found for " + email + ". Please sign up to create your account.");
        }

        User newUser = User.builder()
                .email(pending.getEmail())
                .passwordHash(pending.getPasswordHash())
                .firstName(pending.getFirstName())
                .lastName(pending.getLastName())
                .displayName(pending.getDisplayName())
                .timezone(pending.getTimezone())
                .authProvider("LOCAL")
                .status("ACTIVE")
                .emailVerified(true)
                .build();

        User savedUser = userRepository.save(newUser);
        pendingRegistrations.remove(normalizedEmail);

        log.info("✔ User successfully created in users table after email verification: {}", savedUser.getEmail());

        return VerifyEmailResponse.builder()
                .success(true)
                .code("EMAIL_CONFIRMED")
                .message("Email confirmed and account created successfully! You can now sign in.")
                .build();
    }

    public EmailVerificationStatusResponse getVerificationStatus(String email) {
        return emailVerificationService.getVerificationStatus(email);
    }

    @Transactional
    public AuthResponse login(LoginRequest request, HttpServletRequest httpRequest) {
        String normalizedEmail = request.getEmail().toLowerCase().trim();
        User user = userRepository.findByEmailAndDeletedFalse(normalizedEmail)
                .orElseThrow(() -> AppException.unauthorized("Invalid email or password"));

        if (user.isLocked()) {
            throw AppException.tooManyRequests(
                    "Account is temporarily locked due to too many failed login attempts. Try again later."
            );
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            user.incrementFailedLogins();
            userRepository.save(user);
            throw AppException.unauthorized("Invalid email or password");
        }

        user.resetFailedLogins();
        user.setLastLoginAt(Instant.now());
        userRepository.save(user);

        log.info("User logged in: {}", user.getEmail());

        return generateAuthResponse(user);
    }

    @Transactional
    public AuthResponse socialLogin(SocialLoginRequest request) {
        String provider = request.getProvider() != null ? request.getProvider().toLowerCase().trim() : "google";
        String email = request.getEmail() != null && !request.getEmail().isBlank()
                ? request.getEmail().toLowerCase().trim()
                : provider + ".user@taskflow.dev";

        Optional<User> existingUserOpt = userRepository.findByEmailAndDeletedFalse(email);

        if (existingUserOpt.isEmpty()) {
            // Auto-create account seamlessly for Google user
            String name = request.getName() != null && !request.getName().isBlank()
                    ? request.getName().trim()
                    : Character.toUpperCase(provider.charAt(0)) + provider.substring(1) + " User";
            String[] parts = name.split(" ", 2);
            String first = parts[0];
            String last = parts.length > 1 ? parts[1] : "";

            User newUser = User.builder()
                    .email(email)
                    .passwordHash(passwordEncoder.encode(UUID.randomUUID().toString()))
                    .firstName(first)
                    .lastName(last)
                    .displayName(name)
                    .authProvider(provider.toUpperCase())
                    .providerId(request.getProviderId() != null ? request.getProviderId() : UUID.randomUUID().toString())
                    .avatarUrl(request.getAvatarUrl())
                    .emailVerified(true)
                    .status("ACTIVE")
                    .build();
            User savedUser = userRepository.save(newUser);
            log.info("OAuth user registered and signed in: {} via {}", savedUser.getEmail(), provider);
            return generateAuthResponse(savedUser);
        }

        User user = existingUserOpt.get();
        user.resetFailedLogins();
        user.setLastLoginAt(Instant.now());
        user = userRepository.save(user);

        log.info("OAuth user logged in: {} via {}", user.getEmail(), provider);
        return generateAuthResponse(user);
    }

    @Transactional
    public AuthResponse refreshToken(String refreshTokenValue) {
        if (refreshTokenValue == null || refreshTokenValue.isBlank()) {
            throw AppException.unauthorized("Refresh token is required");
        }

        String tokenHash = hashToken(refreshTokenValue);
        RefreshToken storedToken = refreshTokenRepository.findByTokenHashAndRevokedFalse(tokenHash)
                .orElseThrow(() -> AppException.unauthorized("Invalid refresh token"));

        if (storedToken.isExpired()) {
            storedToken.setRevoked(true);
            refreshTokenRepository.save(storedToken);
            throw AppException.unauthorized("Refresh token has expired");
        }

        storedToken.setRevoked(true);
        refreshTokenRepository.save(storedToken);

        User user = userRepository.findByIdAndDeletedFalse(storedToken.getUserId())
                .orElseThrow(() -> AppException.unauthorized("User not found"));

        return generateAuthResponse(user);
    }

    @Transactional
    public void logout(String refreshTokenValue) {
        if (refreshTokenValue != null && !refreshTokenValue.isBlank()) {
            String tokenHash = hashToken(refreshTokenValue);
            refreshTokenRepository.findByTokenHashAndRevokedFalse(tokenHash)
                    .ifPresent(token -> {
                        token.setRevoked(true);
                        refreshTokenRepository.save(token);
                    });
        }
    }

    @Transactional
    public void logoutAll(UUID userId) {
        refreshTokenRepository.revokeAllByUserId(userId);
        log.info("All sessions revoked for user: {}", userId);
    }

    @Transactional
    public void verifyEmail(String token) {
        String key = RedisConfig.CacheKeys.EMAIL_VERIFY_PREFIX + token;
        String userIdStr = retrieveToken(key);

        if (userIdStr == null) {
            throw AppException.badRequest("INVALID_TOKEN", "Invalid or expired verification token");
        }

        UUID userId = UUID.fromString(userIdStr);
        User user = userRepository.findByIdAndDeletedFalse(userId)
                .orElseThrow(() -> AppException.notFound("User", userId));

        user.setEmailVerified(true);
        userRepository.save(user);
        deleteToken(key);

        log.info("Email verified for user: {}", user.getEmail());
    }

    @Transactional
    public void forgotPassword(String email) {
        userRepository.findByEmailAndDeletedFalse(email.toLowerCase())
                .ifPresent(user -> {
                    String resetToken = UUID.randomUUID().toString();
                    storeToken(
                            RedisConfig.CacheKeys.PASSWORD_RESET_PREFIX + resetToken,
                            user.getId().toString(),
                            RedisConfig.CacheKeys.PASSWORD_RESET_TTL.toSeconds()
                    );
                    log.info("Password reset token generated for: {} (token: {})", email, resetToken);
                });
    }

    @Transactional
    public void resetPassword(String token, String newPassword) {
        String key = RedisConfig.CacheKeys.PASSWORD_RESET_PREFIX + token;
        String userIdStr = retrieveToken(key);

        if (userIdStr == null) {
            throw AppException.badRequest("INVALID_TOKEN", "Invalid or expired reset token");
        }

        UUID userId = UUID.fromString(userIdStr);
        User user = userRepository.findByIdAndDeletedFalse(userId)
                .orElseThrow(() -> AppException.notFound("User", userId));

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.resetFailedLogins();
        userRepository.save(user);

        refreshTokenRepository.revokeAllByUserId(userId);
        deleteToken(key);

        log.info("Password reset for user: {}", user.getEmail());
    }

    private void storeToken(String key, String value, long timeoutSeconds) {
        if (redisTemplate != null) {
            try {
                redisTemplate.opsForValue().set(key, value, timeoutSeconds, TimeUnit.SECONDS);
                return;
            } catch (Exception e) {
                log.warn("Redis error on storeToken, falling back to local map: {}", e.getMessage());
            }
        }
        localTokenStore.put(key, value);
    }

    private String retrieveToken(String key) {
        if (redisTemplate != null) {
            try {
                Object val = redisTemplate.opsForValue().get(key);
                if (val != null) return val.toString();
            } catch (Exception e) {
                log.warn("Redis error on retrieveToken, falling back to local map: {}", e.getMessage());
            }
        }
        return localTokenStore.get(key);
    }

    private void deleteToken(String key) {
        if (redisTemplate != null) {
            try {
                redisTemplate.delete(key);
            } catch (Exception ignored) {}
        }
        localTokenStore.remove(key);
    }

    private AuthResponse generateAuthResponse(User user) {
        String accessToken = jwtProvider.generateAccessToken(user.getId(), user.getEmail());
        String refreshToken = jwtProvider.generateRefreshToken(user.getId());

        RefreshToken storedRefreshToken = RefreshToken.builder()
                .userId(user.getId())
                .tokenHash(hashToken(refreshToken))
                .expiresAt(Instant.now().plusMillis(jwtProvider.getRefreshTokenExpirationMs()))
                .build();
        refreshTokenRepository.save(storedRefreshToken);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(jwtProvider.getAccessTokenExpirationMs() / 1000)
                .user(AuthResponse.UserResponse.builder()
                        .id(user.getId().toString())
                        .email(user.getEmail())
                        .firstName(user.getFirstName())
                        .lastName(user.getLastName())
                        .displayName(user.getDisplayName())
                        .avatarUrl(user.getAvatarUrl())
                        .emailVerified(user.isEmailVerified())
                        .build())
                .build();
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }
}
