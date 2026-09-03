package com.taskflow.identity.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmailVerificationStatusResponse {

    private boolean verified;
    private String email;
    private boolean canResend;
    private int retryAfterSeconds;
}
