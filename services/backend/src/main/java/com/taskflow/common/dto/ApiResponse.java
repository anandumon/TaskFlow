package com.taskflow.common.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {

    private boolean success;
    private T data;
    private ErrorDetail error;
    private PageMeta meta;
    private final Instant timestamp = Instant.now();

    public static <T> ApiResponse<T> success(T data) {
        return ApiResponse.<T>builder()
                .success(true)
                .data(data)
                .build();
    }

    public static <T> ApiResponse<T> success(T data, PageMeta meta) {
        return ApiResponse.<T>builder()
                .success(true)
                .data(data)
                .meta(meta)
                .build();
    }

    public static <T> ApiResponse<T> error(int status, String code, String message) {
        return ApiResponse.<T>builder()
                .success(false)
                .error(ErrorDetail.builder()
                        .status(status)
                        .code(code)
                        .message(message)
                        .build())
                .build();
    }

    public static <T> ApiResponse<T> error(ErrorDetail errorDetail) {
        return ApiResponse.<T>builder()
                .success(false)
                .error(errorDetail)
                .build();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ErrorDetail {
        private int status;
        private String code;
        private String message;
        private java.util.List<FieldError> details;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FieldError {
        private String field;
        private String message;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PageMeta {
        private int page;
        private int pageSize;
        private long totalItems;
        private int totalPages;
    }
}
