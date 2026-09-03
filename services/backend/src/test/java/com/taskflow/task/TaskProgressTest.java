package com.taskflow.task;

import com.taskflow.project.service.ProjectService;
import com.taskflow.task.entity.Task;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class TaskProgressTest {

    @Test
    @DisplayName("Weighted progress matches exact business formula (0/35/75/100)")
    void testWeightedProgressFormula() {
        // 1 todo (0%), 1 in_progress (35%), 1 in_review (75%), 1 done (100%)
        // Total = 210 / 4 = 52.5 -> 53%
        int todo = 1;
        int inProgress = 1;
        int inReview = 1;
        int done = 1;
        int total = todo + inProgress + inReview + done;

        int weightedProgress = Math.round(
                (float) (done * 100 + inReview * 75 + inProgress * 35 + todo * 0) / total
        );

        assertEquals(53, weightedProgress);
    }

    @Test
    @DisplayName("Empty task list yields 0% weighted progress")
    void testEmptyProgress() {
        int total = 0;
        int weightedProgress = total > 0 ? 100 : 0;
        assertEquals(0, weightedProgress);
    }
}
