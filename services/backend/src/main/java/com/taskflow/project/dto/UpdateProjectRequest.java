package com.taskflow.project.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateProjectRequest {
    @Size(max = 255)
    private String name;

    private String description;
    private String status;
    private Integer progress;
    private String color;
    private String icon;
    private String environments;
}
