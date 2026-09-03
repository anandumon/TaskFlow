package com.taskflow.team.dto;

import lombok.Data;

@Data public class UpdateTeamRequest {
    private String name;
    private String description;
    private String color;
    private String icon;
}
