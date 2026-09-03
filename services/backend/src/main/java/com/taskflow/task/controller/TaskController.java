package com.taskflow.task.controller;

import com.taskflow.common.dto.ApiResponse;
import com.taskflow.task.dto.CreateTaskRequest;
import com.taskflow.task.dto.TaskResponse;
import com.taskflow.task.dto.UpdateTaskRequest;
import com.taskflow.task.service.TaskService;
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
public class TaskController {

    private final TaskService taskService;

    @PostMapping("/workspaces/{workspaceId}/tasks")
    public ResponseEntity<ApiResponse<TaskResponse>> createTask(
            @PathVariable UUID workspaceId,
            @Valid @RequestBody CreateTaskRequest request) {
        TaskResponse task = taskService.createTask(workspaceId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(task));
    }

    @GetMapping("/workspaces/{workspaceId}/tasks")
    public ResponseEntity<ApiResponse<List<TaskResponse>>> getWorkspaceTasks(
            @PathVariable UUID workspaceId) {
        List<TaskResponse> tasks = taskService.getTasksByWorkspace(workspaceId);
        return ResponseEntity.ok(ApiResponse.success(tasks));
    }

    @GetMapping("/projects/{projectId}/tasks")
    public ResponseEntity<ApiResponse<List<TaskResponse>>> getProjectTasks(
            @PathVariable UUID projectId) {
        List<TaskResponse> tasks = taskService.getTasksByProject(projectId);
        return ResponseEntity.ok(ApiResponse.success(tasks));
    }

    @GetMapping("/tasks/{id}")
    public ResponseEntity<ApiResponse<TaskResponse>> getTask(@PathVariable UUID id) {
        TaskResponse task = taskService.getTaskById(id);
        return ResponseEntity.ok(ApiResponse.success(task));
    }

    @PatchMapping("/tasks/{id}")
    public ResponseEntity<ApiResponse<TaskResponse>> updateTask(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateTaskRequest request) {
        TaskResponse task = taskService.updateTask(id, request);
        return ResponseEntity.ok(ApiResponse.success(task));
    }

    @DeleteMapping("/tasks/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteTask(@PathVariable UUID id) {
        taskService.deleteTask(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
