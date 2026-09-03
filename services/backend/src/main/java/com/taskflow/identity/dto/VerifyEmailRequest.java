package com.taskflow.identity.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VerifyEmailRequest {

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    @Pattern(regexp = "^[0-9]{6}$", message = "Verification code must be exactly 6 digits")
    private String code;

    @Pattern(regexp = "^[0-9]{6}$", message = "Verification code must be exactly 6 digits")
    private String otp;

    public String getEffectiveOtp() {
        if (otp != null && !otp.isBlank()) {
            return otp.trim();
        }
        if (code != null && !code.isBlank()) {
            return code.trim();
        }
        return "";
    }
}
