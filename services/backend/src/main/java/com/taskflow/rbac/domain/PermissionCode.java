package com.taskflow.rbac.domain;

import java.util.Arrays;
import java.util.List;

public enum PermissionCode {
    // Organization
    ORGANIZATION_VIEW("ORGANIZATION_VIEW", "organization.view"),
    ORGANIZATION_UPDATE("ORGANIZATION_UPDATE", "organization.edit"),
    ORGANIZATION_DELETE("ORGANIZATION_DELETE", "organization.delete"),
    ORGANIZATION_INVITE("ORGANIZATION_INVITE", "users.invite"),
    ORGANIZATION_REMOVE_MEMBER("ORGANIZATION_REMOVE_MEMBER", "users.remove"),
    ORGANIZATION_MANAGE_ROLES("ORGANIZATION_MANAGE_ROLES", "roles.manage"),
    ORGANIZATION_MEMBERS_MANAGE("ORGANIZATION_MEMBERS_MANAGE", "users.manage", "users.invite", "users.remove"),

    // Workspace
    WORKSPACE_VIEW("WORKSPACE_VIEW", "workspace.view"),
    WORKSPACE_CREATE("WORKSPACE_CREATE", "workspace.create"),
    WORKSPACE_UPDATE("WORKSPACE_UPDATE", "workspace.edit"),
    WORKSPACE_DELETE("WORKSPACE_DELETE", "workspace.delete"),
    WORKSPACE_INVITE("WORKSPACE_INVITE", "workspace.invite"),
    WORKSPACE_REMOVE_MEMBER("WORKSPACE_REMOVE_MEMBER", "workspace.remove_member"),
    WORKSPACE_MEMBERS_MANAGE("WORKSPACE_MEMBERS_MANAGE", "workspace.members_manage", "workspace.invite", "workspace.remove_member"),

    // Project
    PROJECT_VIEW("PROJECT_VIEW", "project.view"),
    PROJECT_CREATE("PROJECT_CREATE", "project.create"),
    PROJECT_UPDATE("PROJECT_UPDATE", "project.edit"),
    PROJECT_DELETE("PROJECT_DELETE", "project.delete"),
    PROJECT_INVITE("PROJECT_INVITE", "project.invite"),
    PROJECT_REMOVE_MEMBER("PROJECT_REMOVE_MEMBER", "project.remove_member"),
    PROJECT_MANAGE_ROLES("PROJECT_MANAGE_ROLES", "project.manage_roles"),
    PROJECT_MEMBERS_MANAGE("PROJECT_MEMBERS_MANAGE", "project.members_manage", "project.invite", "project.remove_member"),

    // Task
    TASK_VIEW("TASK_VIEW", "task.view"),
    TASK_CREATE("TASK_CREATE", "task.create"),
    TASK_UPDATE("TASK_UPDATE", "task.edit"),
    TASK_DELETE("TASK_DELETE", "task.delete"),
    TASK_ASSIGN("TASK_ASSIGN", "task.assign"),
    TASK_COMMENT("TASK_COMMENT", "task.comment"),
    TASK_COMPLETE("TASK_COMPLETE", "task.complete"),
    TASK_REOPEN("TASK_REOPEN", "task.reopen"),
    TASK_MOVE("TASK_MOVE", "task.move");

    private final List<String> codes;

    PermissionCode(String... codes) {
        this.codes = Arrays.asList(codes);
    }

    public List<String> getCodes() {
        return codes;
    }

    public boolean matches(String permissionString) {
        if (permissionString == null) return false;
        String clean = permissionString.trim();
        for (String c : codes) {
            if (c.equalsIgnoreCase(clean)) return true;
        }
        return false;
    }
}
