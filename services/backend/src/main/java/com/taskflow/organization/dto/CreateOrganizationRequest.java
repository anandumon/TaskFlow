package com.taskflow.organization.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateOrganizationRequest {
    @NotBlank(message = "Organization name is required")
    @Size(max = 200, message = "Name must be at most 200 characters")
    private String name;
}
