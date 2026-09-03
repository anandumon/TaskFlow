package com.taskflow.common.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class AppException extends RuntimeException {

    private final HttpStatus status;
    private final String code;

    public AppException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public AppException(HttpStatus status, String code, String message, Throwable cause) {
        super(message, cause);
        this.status = status;
        this.code = code;
    }

    // ── Convenience factory methods ──────────────────────────

    public static AppException notFound(String message) {
        return new AppException(HttpStatus.NOT_FOUND, "NOT_FOUND", message);
    }

    public static AppException notFound(String entity, Object id) {
        return new AppException(
                HttpStatus.NOT_FOUND,
                entity.toUpperCase() + "_NOT_FOUND",
                entity + " not found with id: " + id
        );
    }

    public static AppException badRequest(String code, String message) {
        return new AppException(HttpStatus.BAD_REQUEST, code, message);
    }

    public static AppException unauthorized(String message) {
        return new AppException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", message);
    }

    public static AppException forbidden(String message) {
        return new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN", message);
    }

    public static AppException conflict(String code, String message) {
        return new AppException(HttpStatus.CONFLICT, code, message);
    }

    public static AppException tooManyRequests(String message) {
        return new AppException(HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMIT_EXCEEDED", message);
    }
}
