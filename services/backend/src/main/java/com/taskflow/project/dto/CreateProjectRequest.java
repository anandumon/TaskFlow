package com.taskflow.project.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateProjectRequest {
    @NotBlank(message = "Project name is required")
    @Size(max = 255)
    private String name;

    private String description;
    private String status;
    private Integer progress;
    private String color;
    private String icon;
    private String environments;
}
