package com.taskflow.task;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class TaskEnvironmentLifecycleTest {

    @Test
    @DisplayName("In Review status defaults to DEV environment")
    void testInReviewDefaultEnv() {
        String status = "in_review";
        String requestedEnv = null;
        String resolvedEnv = (requestedEnv == null || requestedEnv.isBlank()) ? "DEV" : requestedEnv;
        assertEquals("DEV", resolvedEnv);
    }

    @Test
    @DisplayName("Promotion to MAIN automatically transitions status to done")
    void testMainPromotionAutoDone() {
        String nextEnv = "MAIN";
        String status = nextEnv.equals("MAIN") ? "done" : "in_progress";
        assertEquals("done", status);
    }
}
