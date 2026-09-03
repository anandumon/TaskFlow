package com.taskflow.project.controller;

import com.taskflow.common.dto.ApiResponse;
import com.taskflow.project.dto.CreateProjectRequest;
import com.taskflow.project.dto.ProjectResponse;
import com.taskflow.project.dto.UpdateProjectRequest;
import com.taskflow.project.service.ProjectService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;

    @PostMapping("/workspaces/{workspaceId}/projects")
    public ResponseEntity<ApiResponse<ProjectResponse>> createProject(
            @PathVariable UUID workspaceId,
            @Valid @RequestBody CreateProjectRequest request) {
        ProjectResponse project = projectService.createProject(workspaceId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(project));
    }

    @GetMapping("/workspaces/{workspaceId}/projects")
    public ResponseEntity<ApiResponse<List<ProjectResponse>>> getProjects(
            @PathVariable UUID workspaceId) {
        List<ProjectResponse> projects = projectService.getProjectsByWorkspace(workspaceId);
        return ResponseEntity.ok(ApiResponse.success(projects));
    }

    @GetMapping("/projects/{id}")
    public ResponseEntity<ApiResponse<ProjectResponse>> getProject(@PathVariable UUID id) {
        ProjectResponse project = projectService.getProjectById(id);
        return ResponseEntity.ok(ApiResponse.success(project));
    }

    @PatchMapping("/projects/{id}")
    public ResponseEntity<ApiResponse<ProjectResponse>> updateProject(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateProjectRequest request) {
        ProjectResponse project = projectService.updateProject(id, request);
        return ResponseEntity.ok(ApiResponse.success(project));
    }

    @DeleteMapping("/projects/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteProject(@PathVariable UUID id) {
        projectService.deleteProject(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
