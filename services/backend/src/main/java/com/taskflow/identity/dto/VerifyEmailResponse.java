package com.taskflow.identity.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VerifyEmailResponse {

    private boolean success;
    private String code;
    private String message;
    private Integer remainingAttempts;
}
