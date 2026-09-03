package com.taskflow.common.constant;

public final class TaskConstants {
    private TaskConstants() {}

    // Weighted Progress Engine Stage Weights
    public static final int WEIGHT_TODO = 0;
    public static final int WEIGHT_IN_PROGRESS = 35;
    public static final int WEIGHT_IN_REVIEW = 75;
    public static final int WEIGHT_DONE = 100;

    // Environment Promotion Pipeline Standards
    public static final String DEFAULT_REVIEW_ENVIRONMENT = "DEV";
    public static final String PRODUCTION_ENVIRONMENT = "MAIN";
    public static final String STATUS_DONE = "done";
    public static final String STATUS_IN_REVIEW = "in_review";
}
