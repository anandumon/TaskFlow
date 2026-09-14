package com.taskflow.identity.controller;

import com.taskflow.common.dto.ApiResponse;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import com.taskflow.common.security.UserPrincipal;
import com.taskflow.identity.dto.UserResourceTreeResponse;
import com.taskflow.identity.service.UserResourceService;
import com.taskflow.rbac.domain.PermissionCode;
import com.taskflow.rbac.service.AuthorizationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/me")
@RequiredArgsConstructor
@Tag(name = "User Resources", description = "Current authenticated user resource tree & permissions")
public class UserResourceController {

    private final UserResourceService userResourceService;
    private final AuthorizationService authorizationService;

    @GetMapping("/resources")
    @Operation(summary = "Get authorized hierarchical resource tree (Personal Space, Orgs, Workspaces, Projects)")
    public ResponseEntity<ApiResponse<UserResourceTreeResponse>> getMyResources(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        UserResourceTreeResponse tree = userResourceService.getUserResourceTree(principal.getId());
        return ResponseEntity.ok(ApiResponse.success(tree));
    }

    @GetMapping("/permissions")
    @Operation(summary = "Get effective permissions for current context")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getMyPermissions(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) UUID organizationId,
            @RequestParam(required = false) UUID workspaceId,
            @RequestParam(required = false) UUID projectId
    ) {
        Map<String, Object> result = new HashMap<>();
        result.put("userId", principal.getId());

        if (projectId != null) {
            Set<String> projectPerms = authorizationService.getEffectivePermissionsForProject(principal.getId(), projectId);
            result.put("projectPermissions", projectPerms);
        }
        if (organizationId != null) {
            boolean isOrgAdmin = authorizationService.hasOrganizationPermission(principal.getId(), organizationId, PermissionCode.ORGANIZATION_UPDATE);
            result.put("isOrganizationAdmin", isOrgAdmin);
        }
        if (workspaceId != null) {
            boolean isWsAdmin = authorizationService.hasWorkspacePermission(principal.getId(), workspaceId, PermissionCode.WORKSPACE_UPDATE);
            result.put("isWorkspaceAdmin", isWsAdmin);
        }

        return ResponseEntity.ok(ApiResponse.success(result));
    }
}
