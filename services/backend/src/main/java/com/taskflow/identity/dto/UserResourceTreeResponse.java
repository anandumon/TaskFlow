package com.taskflow.identity.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResourceTreeResponse {

    private PersonalSpaceDTO personalSpace;
    @Builder.Default
    private List<OrgResourceDTO> organizations = new ArrayList<>();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PersonalSpaceDTO {
        private UUID id;
        private String name;
        private String description;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OrgResourceDTO {
        private UUID id;
        private String name;
        private String slug;
        private String logoUrl;
        private String role;
        private boolean isOwner;
        @Builder.Default
        private List<WorkspaceResourceDTO> workspaces = new ArrayList<>();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WorkspaceResourceDTO {
        private UUID id;
        private String name;
        private String slug;
        private String color;
        private String icon;
        private String role;
        @Builder.Default
        private List<ProjectResourceDTO> projects = new ArrayList<>();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProjectResourceDTO {
        private UUID id;
        private String name;
        private String slug;
        private String color;
        private String icon;
        private String status;
        private String role;
    }
}
