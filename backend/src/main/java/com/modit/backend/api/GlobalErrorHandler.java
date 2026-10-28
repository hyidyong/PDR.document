package com.modit.backend.api;

import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.*;
import org.springframework.http.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class GlobalErrorHandler {
    public record ErrorBody(String code, String message, Instant timestamp, String path) {}
    private ResponseEntity<ErrorBody> error(HttpStatus status, String message, HttpServletRequest request) {
        return ResponseEntity.status(status).body(new ErrorBody(status.name(), message, Instant.now(), request.getRequestURI()));
    }
    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<ErrorBody> missing(NoSuchElementException e, HttpServletRequest request) { return error(HttpStatus.NOT_FOUND, e.getMessage(), request); }
    @ExceptionHandler({IllegalArgumentException.class, MethodArgumentNotValidException.class})
    public ResponseEntity<ErrorBody> invalid(Exception e, HttpServletRequest request) { return error(HttpStatus.BAD_REQUEST, e.getMessage(), request); }
    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ErrorBody> conflict(IllegalStateException e, HttpServletRequest request) { return error(HttpStatus.CONFLICT, e.getMessage(), request); }
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ErrorBody> tooLarge(MaxUploadSizeExceededException e, HttpServletRequest request) { return error(HttpStatus.PAYLOAD_TOO_LARGE, "파일은 20MB 이하여야 합니다.", request); }
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ErrorBody> status(ResponseStatusException e, HttpServletRequest request) { return error((HttpStatus)e.getStatusCode(), e.getReason(), request); }
}
