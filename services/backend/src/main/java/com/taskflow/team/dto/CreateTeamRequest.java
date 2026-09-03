package com.taskflow.team.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data public class CreateTeamRequest {
    @NotBlank @Size(max = 200) private String name;
    @Size(max = 1000) private String description;
    private String color;
    private String icon;
}
