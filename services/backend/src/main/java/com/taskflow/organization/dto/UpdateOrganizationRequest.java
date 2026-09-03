package com.taskflow.organization.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateOrganizationRequest {
    @Size(max = 200)
    private String name;
    @Size(max = 500)
    private String logoUrl;
}
