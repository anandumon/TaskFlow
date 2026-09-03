package com.taskflow.identity.controller;

import com.taskflow.common.dto.ApiResponse;
import com.taskflow.common.exception.AppException;
import com.taskflow.common.security.UserPrincipal;
import com.taskflow.identity.dto.*;
import com.taskflow.identity.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(
            @Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {
        AuthResponse response = authService.login(request, httpRequest);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/check-user")
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> checkUser(
            @RequestParam("email") String email) {
        boolean exists = authService.checkUserExists(email);
        java.util.Map<String, Object> result = new java.util.HashMap<>();
        result.put("email", email != null ? email.toLowerCase().trim() : "");
        result.put("exists", exists);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PostMapping("/oauth")
    public ResponseEntity<ApiResponse<AuthResponse>> socialLogin(
            @Valid @RequestBody SocialLoginRequest request) {
        AuthResponse response = authService.socialLogin(request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refreshToken(
            @RequestBody RefreshTokenRequest request) {
        AuthResponse response = authService.refreshToken(request.getRefreshToken());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(
            @RequestBody(required = false) RefreshTokenRequest request) {
        authService.logout(request != null ? request.getRefreshToken() : null);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PostMapping("/logout-all")
    public ResponseEntity<ApiResponse<Void>> logoutAll(
            @AuthenticationPrincipal UserPrincipal principal) {
        authService.logoutAll(principal.getId());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @GetMapping("/confirm-email")
    public ResponseEntity<ApiResponse<VerifyEmailResponse>> confirmEmailGet(
            @RequestParam(required = false) String email,
            @RequestParam(required = false) String token) {
        VerifyEmailResponse response = authService.confirmEmail(email, token);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/confirm-email")
    public ResponseEntity<ApiResponse<VerifyEmailResponse>> confirmEmailPost(
            @RequestParam(required = false) String email,
            @RequestParam(required = false) String token) {
        VerifyEmailResponse response = authService.confirmEmail(email, token);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/verify-email")
    public ResponseEntity<ApiResponse<VerifyEmailResponse>> verifyEmail(
            @Valid @RequestBody VerifyEmailRequest request) {
        VerifyEmailResponse response = authService.verifyEmailCode(request);
        if (!response.isSuccess()) {
            return ResponseEntity.badRequest().body(ApiResponse.error(400, response.getCode(), response.getMessage()));
        }
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/resend-verification-otp")
    public ResponseEntity<ApiResponse<ResendOtpResponse>> resendVerificationOtp(
            @Valid @RequestBody ResendOtpRequest request) {
        ResendOtpResponse response = authService.resendVerificationCode(request.getEmail());
        if (!response.isSuccess()) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(ApiResponse.error(429, response.getCode(), response.getMessage()));
        }
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/resend-code")
    public ResponseEntity<ApiResponse<ResendOtpResponse>> resendCode(
            @RequestParam String email) {
        ResendOtpResponse response = authService.resendVerificationCode(email);
        if (!response.isSuccess()) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(ApiResponse.error(429, response.getCode(), response.getMessage()));
        }
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/email-verification/status")
    public ResponseEntity<ApiResponse<EmailVerificationStatusResponse>> getEmailVerificationStatus(
            @RequestParam String email) {
        EmailVerificationStatusResponse response = authService.getVerificationStatus(email);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request.getEmail());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request.getToken(), request.getNewPassword());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<AuthResponse.UserResponse>> me(
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            throw AppException.unauthorized("Not authenticated");
        }
        AuthResponse.UserResponse user = AuthResponse.UserResponse.builder()
                .id(principal.getId().toString())
                .email(principal.getEmail())
                .firstName(principal.getFirstName())
                .lastName(principal.getLastName())
                .emailVerified(principal.isEmailVerified())
                .build();
        return ResponseEntity.ok(ApiResponse.success(user));
    }

    // ── Request DTOs ────────────────────────────────────────

    @Data
    public static class RefreshTokenRequest {
        private String refreshToken;
    }

    @Data
    public static class ForgotPasswordRequest {
        @NotBlank @Email private String email;
    }

    @Data
    public static class ResetPasswordRequest {
        @NotBlank private String token;
        @NotBlank @Size(min = 8, max = 128) private String newPassword;
    }
}
