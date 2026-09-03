package com.taskflow.common.exception;

import com.taskflow.common.dto.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.util.List;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(AppException.class)
    public ResponseEntity<ApiResponse<Void>> handleAppException(AppException ex) {
        log.warn("Application error: [{}] {}", ex.getCode(), ex.getMessage());
        return ResponseEntity
                .status(ex.getStatus())
                .body(ApiResponse.error(ex.getStatus().value(), ex.getCode(), ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidationException(MethodArgumentNotValidException ex) {
        List<ApiResponse.FieldError> fieldErrors = ex.getBindingResult().getFieldErrors().stream()
                .map(this::mapFieldError)
                .toList();

        ApiResponse.ErrorDetail error = ApiResponse.ErrorDetail.builder()
                .status(HttpStatus.BAD_REQUEST.value())
                .code("VALIDATION_ERROR")
                .message("Validation failed")
                .details(fieldErrors)
                .build();

        return ResponseEntity.badRequest().body(ApiResponse.error(error));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccessDenied(AccessDeniedException ex) {
        return ResponseEntity
                .status(HttpStatus.FORBIDDEN)
                .body(ApiResponse.error(403, "FORBIDDEN", "You don't have permission to perform this action"));
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiResponse<Void>> handleBadCredentials(BadCredentialsException ex) {
        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.error(401, "INVALID_CREDENTIALS", "Invalid email or password"));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiResponse<Void>> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        return ResponseEntity
                .badRequest()
                .body(ApiResponse.error(400, "INVALID_PARAMETER", "Invalid parameter: " + ex.getName()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGenericException(Exception ex) {
        log.error("Unhandled exception", ex);
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error(500, "INTERNAL_ERROR", "An unexpected error occurred"));
    }

    private ApiResponse.FieldError mapFieldError(FieldError fieldError) {
        return ApiResponse.FieldError.builder()
                .field(fieldError.getField())
                .message(fieldError.getDefaultMessage())
                .build();
    }
}
