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
import com.taskflow.common.config.DataInitializer;
import com.taskflow.organization.entity.OrganizationMember;
import com.taskflow.organization.repository.OrganizationMemberRepository;
import com.taskflow.organization.repository.OrganizationRepository;
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
    private final OrganizationRepository organizationRepository;
    private final OrganizationMemberRepository organizationMemberRepository;
    private final ConcurrentHashMap<String, String> localTokenStore = new ConcurrentHashMap<>();

    public AuthService(UserRepository userRepository,
                       RefreshTokenRepository refreshTokenRepository,
                       PasswordEncoder passwordEncoder,
                       JwtProvider jwtProvider,
                       @Autowired(required = false) RedisTemplate<String, Object> redisTemplate,
                       EventPublisher eventPublisher,
                       EmailVerificationService emailVerificationService,
                       @Autowired(required = false) OrganizationRepository organizationRepository,
                       @Autowired(required = false) OrganizationMemberRepository organizationMemberRepository) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtProvider = jwtProvider;
        this.redisTemplate = redisTemplate;
        this.eventPublisher = eventPublisher;
        this.emailVerificationService = emailVerificationService;
        this.organizationRepository = organizationRepository;
        this.organizationMemberRepository = organizationMemberRepository;
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
        private String authProvider;
        private String providerId;
        private String avatarUrl;
        private String token;
        private String otp;
        private Instant createdAt;
    }

    private final java.util.Map<String, PendingRegistration> pendingRegistrations = new ConcurrentHashMap<>();

    public AuthResponse register(RegisterRequest request) {
        String email = request.getEmail().toLowerCase().trim();
        if (userRepository.existsByEmailAndDeletedFalse(email)) {
            throw AppException.conflict("EMAIL_EXISTS", "An account with this email already exists. Please sign in.");
        }

        if (request.getPassword() == null || request.getPassword().length() < 8) {
            throw AppException.badRequest("INVALID_PASSWORD", "Password must be at least 8 characters long");
        }

        String rawToken = UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        String rawOtp = String.format("%06d", new java.security.SecureRandom().nextInt(1000000));
        String authProvider = (request.getAuthProvider() != null && !request.getAuthProvider().isBlank())
                ? request.getAuthProvider().toUpperCase().trim()
                : "LOCAL";

        PendingRegistration pending = PendingRegistration.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .firstName(request.getFirstName().trim())
                .lastName(request.getLastName().trim())
                .displayName(request.getFirstName().trim() + " " + request.getLastName().trim())
                .timezone(request.getTimezone() != null ? request.getTimezone() : "UTC")
                .authProvider(authProvider)
                .providerId(request.getProviderId())
                .avatarUrl(request.getAvatarUrl())
                .token(rawToken)
                .otp(rawOtp)
                .createdAt(Instant.now())
                .build();

        pendingRegistrations.put(email, pending);

        // Dispatch confirmation link & verification OTP to user's inbox (User is NOT yet saved to database)
        emailVerificationService.sendPendingConfirmationEmail(email, pending.getFirstName(), rawToken, rawOtp);

        log.info("⏳ Pending registration created for: {} (Awaiting email verification before DB insertion)", email);

        return AuthResponse.builder()
                .requiresVerification(true)
                .verificationMessage("A confirmation link and verification code have been sent to your email. Please verify your email to complete registration.")
                .devCode(rawOtp)
                .confirmationToken(rawToken)
                .user(AuthResponse.UserResponse.builder()
                        .email(email)
                        .firstName(pending.getFirstName())
                        .lastName(pending.getLastName())
                        .displayName(pending.getDisplayName())
                        .emailVerified(false)
                        .build())
                .build();
    }

    @Transactional
    public VerifyEmailResponse verifyEmailCode(VerifyEmailRequest request) {
        String email = request.getEmail() != null ? request.getEmail().toLowerCase().trim() : "";
        String otp = request.getEffectiveOtp();
        if (otp.isBlank()) {
            throw AppException.badRequest("INVALID_OTP", "6-digit verification code is required");
        }

        // Check if there is a pending registration waiting for verification
        PendingRegistration pending = pendingRegistrations.get(email);
        if (pending != null) {
            boolean matches = (pending.getOtp() != null && pending.getOtp().equals(otp.trim()))
                    || (pending.getToken() != null && pending.getToken().equalsIgnoreCase(otp.trim()));
            if (matches) {
                User newUser = User.builder()
                        .email(pending.getEmail())
                        .passwordHash(pending.getPasswordHash())
                        .firstName(pending.getFirstName())
                        .lastName(pending.getLastName())
                        .displayName(pending.getDisplayName())
                        .timezone(pending.getTimezone())
                        .authProvider(pending.getAuthProvider() != null ? pending.getAuthProvider() : "LOCAL")
                        .providerId(pending.getProviderId())
                        .avatarUrl(pending.getAvatarUrl())
                        .status("ACTIVE")
                        .emailVerified(true)
                        .build();

                User savedUser = userRepository.save(newUser);
                pendingRegistrations.remove(email);
                log.info("✔ User successfully created in database after OTP verification: {}", savedUser.getEmail());

                AuthResponse auth = generateAuthResponse(savedUser);
                return VerifyEmailResponse.builder()
                        .success(true)
                        .code("EMAIL_CONFIRMED")
                        .message("Email confirmed and account created successfully!")
                        .accessToken(auth.getAccessToken())
                        .refreshToken(auth.getRefreshToken())
                        .user(auth.getUser())
                        .build();
            } else {
                return VerifyEmailResponse.builder()
                        .success(false)
                        .code("INVALID_OTP")
                        .message("The verification code is incorrect. Please check the code in your email.")
                        .build();
            }
        }

        return emailVerificationService.verifyOtp(email, otp);
    }

    public ResendOtpResponse resendVerificationCode(String email) {
        String normalizedEmail = email != null ? email.toLowerCase().trim() : "";
        PendingRegistration pending = pendingRegistrations.get(normalizedEmail);
        if (pending != null) {
            emailVerificationService.sendPendingConfirmationEmail(normalizedEmail, pending.getFirstName(), pending.getToken(), pending.getOtp());
            return ResendOtpResponse.builder()
                    .success(true)
                    .code("CONFIRMATION_RESENT")
                    .message("A fresh confirmation email and code have been sent to your inbox.")
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

        // 1. If already saved and verified in users table
        Optional<User> existingUserOpt = userRepository.findByEmailAndDeletedFalse(normalizedEmail);
        if (existingUserOpt.isPresent()) {
            User user = existingUserOpt.get();
            if (!user.isEmailVerified()) {
                user.setEmailVerified(true);
                user.setStatus("ACTIVE");
                userRepository.save(user);
            }
            AuthResponse auth = generateAuthResponse(user);
            return VerifyEmailResponse.builder()
                    .success(true)
                    .code("EMAIL_CONFIRMED")
                    .message("Email verified successfully!")
                    .accessToken(auth.getAccessToken())
                    .refreshToken(auth.getRefreshToken())
                    .user(auth.getUser())
                    .build();
        }

        // 2. Fetch from pending registrations and save user to users table ONLY now
        PendingRegistration pending = pendingRegistrations.get(normalizedEmail);
        if (pending == null) {
            log.warn("No pending registration found for email: {}", normalizedEmail);
            throw AppException.notFound("No pending signup found for " + email + ". Please sign up to create your account.");
        }

        if (token != null && !token.isBlank() && pending.getToken() != null && !pending.getToken().isBlank()) {
            if (!pending.getToken().equalsIgnoreCase(token.trim())) {
                throw AppException.badRequest("INVALID_TOKEN", "The confirmation token is invalid or expired.");
            }
        }

        User newUser = User.builder()
                .email(pending.getEmail())
                .passwordHash(pending.getPasswordHash())
                .firstName(pending.getFirstName())
                .lastName(pending.getLastName())
                .displayName(pending.getDisplayName())
                .timezone(pending.getTimezone())
                .authProvider(pending.getAuthProvider() != null ? pending.getAuthProvider() : "LOCAL")
                .providerId(pending.getProviderId())
                .avatarUrl(pending.getAvatarUrl())
                .status("ACTIVE")
                .emailVerified(true)
                .build();

        User savedUser = userRepository.save(newUser);
        pendingRegistrations.remove(normalizedEmail);

        log.info("✔ User successfully created in database after email link verification: {}", savedUser.getEmail());

        AuthResponse auth = generateAuthResponse(savedUser);
        return VerifyEmailResponse.builder()
                .success(true)
                .code("EMAIL_CONFIRMED")
                .message("Email confirmed and account created successfully!")
                .accessToken(auth.getAccessToken())
                .refreshToken(auth.getRefreshToken())
                .user(auth.getUser())
                .build();
    }

    public EmailVerificationStatusResponse getVerificationStatus(String email) {
        return emailVerificationService.getVerificationStatus(email);
    }

    public boolean checkUserExists(String email) {
        if (email == null || email.isBlank()) return false;
        return userRepository.existsByEmailAndDeletedFalse(email.toLowerCase().trim());
    }

    @Transactional
    public AuthResponse login(LoginRequest request, HttpServletRequest httpRequest) {
        String normalizedEmail = request.getEmail().toLowerCase().trim();
        if (pendingRegistrations.containsKey(normalizedEmail)) {
            throw AppException.unauthorized("Please verify your email address to complete registration before signing in.");
        }
        User user = userRepository.findByEmailAndDeletedFalse(normalizedEmail)
                .orElseThrow(() -> AppException.notFound("No account found with this email. Please sign up to create your account."));

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
        if (request.getEmail() == null || request.getEmail().isBlank()) {
            throw AppException.badRequest("EMAIL_REQUIRED", "Email address is required for social authentication.");
        }
        String email = request.getEmail().toLowerCase().trim();

        // 1. Check if user exists in database
        Optional<User> existingUserOpt = userRepository.findByEmailAndDeletedFalse(email);

        if (existingUserOpt.isEmpty()) {
            // If in signin mode, do NOT auto-create! Reject with 404 to redirect to signup page!
            if (!"signup".equalsIgnoreCase(request.getMode())) {
                log.info("Social sign-in rejected for non-existent user: {}. Redirecting to signup flow.", email);
                throw AppException.notFound("No TaskFlow account found for " + email + ". Please sign up to create your account.");
            }

            // In signup mode: authenticate with Google, create user in DB, and assign to organization
            String name = request.getName() != null && !request.getName().isBlank()
                    ? request.getName().trim()
                    : Character.toUpperCase(provider.charAt(0)) + provider.substring(1) + " User";
            String[] parts = name.split(" ", 2);
            String first = parts[0];
            String last = parts.length > 1 ? parts[1] : "";

            String effectiveProviderId = request.getProviderId();
            if (effectiveProviderId != null && !effectiveProviderId.isBlank()) {
                if (effectiveProviderId.contains(".") && effectiveProviderId.length() > 100) {
                    try {
                        String[] jwtParts = effectiveProviderId.split("\\.");
                        if (jwtParts.length >= 2) {
                            String payload = new String(java.util.Base64.getUrlDecoder().decode(jwtParts[1]), java.nio.charset.StandardCharsets.UTF_8);
                            int subIdx = payload.indexOf("\"sub\":");
                            if (subIdx != -1) {
                                int start = payload.indexOf("\"", subIdx + 6) + 1;
                                int end = payload.indexOf("\"", start);
                                if (start > 0 && end > start) {
                                    effectiveProviderId = payload.substring(start, end);
                                }
                            }
                        }
                    } catch (Exception e) {
                        log.warn("Could not extract sub from providerId JWT: {}", e.getMessage());
                    }
                }
            }
            if (effectiveProviderId == null || effectiveProviderId.isBlank()) {
                effectiveProviderId = UUID.randomUUID().toString();
            }

            User newUser = User.builder()
                    .email(email)
                    .passwordHash(passwordEncoder.encode(UUID.randomUUID().toString()))
                    .firstName(first)
                    .lastName(last)
                    .displayName(name)
                    .authProvider(provider.toUpperCase())
                    .providerId(effectiveProviderId)
                    .avatarUrl(request.getAvatarUrl())
                    .emailVerified(true)
                    .status("ACTIVE")
                    .build();

            User savedUser = userRepository.save(newUser);
            log.info("✔ Google user signed up and saved to database: {}", savedUser.getEmail());
            return generateAuthResponse(savedUser);
        }

        // 2. User exists: verify status and email verification
        User user = existingUserOpt.get();

        if (user.isDeleted() || !"ACTIVE".equalsIgnoreCase(user.getStatus())) {
            throw AppException.unauthorized("Your account is disabled. Please contact your workspace administrator.");
        }

        if (!user.isEmailVerified()) {
            throw AppException.unauthorized("Please verify your email address to complete registration before signing in.");
        }

        if (user.isLocked()) {
            throw AppException.tooManyRequests(
                    "Account is temporarily locked due to security policy. Please try again later."
            );
        }

        // Link OAuth provider details if not already set
        if (user.getAuthProvider() == null || "LOCAL".equalsIgnoreCase(user.getAuthProvider())) {
            user.setAuthProvider(provider.toUpperCase());
            if (request.getProviderId() != null && !request.getProviderId().isBlank()) {
                user.setProviderId(request.getProviderId());
            }
        }

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
