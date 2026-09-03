package com.taskflow.identity.controller;

import com.taskflow.common.dto.ApiResponse;
import com.taskflow.common.security.UserPrincipal;
import com.taskflow.identity.dto.UpdateProfileRequest;
import com.taskflow.identity.dto.UserProfileResponse;
import com.taskflow.identity.service.UserService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserProfileResponse>> getProfile(
            @AuthenticationPrincipal UserPrincipal principal) {
        UserProfileResponse profile = userService.getProfile(principal.getId());
        return ResponseEntity.ok(ApiResponse.success(profile));
    }

    @PatchMapping("/me")
    public ResponseEntity<ApiResponse<UserProfileResponse>> updateProfile(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody UpdateProfileRequest request) {
        UserProfileResponse profile = userService.updateProfile(principal.getId(), request);
        return ResponseEntity.ok(ApiResponse.success(profile));
    }

    @PatchMapping("/me/password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody ChangePasswordRequest request) {
        userService.changePassword(principal.getId(), request.getCurrentPassword(), request.getNewPassword());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Data
    public static class ChangePasswordRequest {
        @NotBlank private String currentPassword;
        @NotBlank @Size(min = 8, max = 128) private String newPassword;
    }
}
