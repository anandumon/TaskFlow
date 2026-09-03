package com.taskflow.workspace.dto;

import lombok.Data;

@Data
public class UpdateWorkspaceRequest {
    private String name;
    private String description;
    private String color;
    private String icon;
}
