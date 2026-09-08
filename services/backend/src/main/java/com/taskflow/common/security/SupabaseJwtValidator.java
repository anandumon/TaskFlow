package com.taskflow.common.security;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Builder;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;

@Slf4j
@Component
public class SupabaseJwtValidator {

    private final ObjectMapper objectMapper;
    private final String supabaseUrl;

    public SupabaseJwtValidator(
            ObjectMapper objectMapper,
            @Value("${supabase.url:https://dxrcfczdfstnymbeicmq.supabase.co}") String supabaseUrl) {
        this.objectMapper = objectMapper;
        this.supabaseUrl = supabaseUrl != null ? supabaseUrl.trim() : "https://dxrcfczdfstnymbeicmq.supabase.co";
    }

    @Data
    @Builder
    public static class SupabaseUserClaims {
        private UUID userId;
        private String email;
        private String firstName;
        private String lastName;
        private String avatarUrl;
        private String role;
        private Instant expiresAt;
    }

    /**
     * Validates and extracts claims from a Supabase Auth JWT token.
     */
    public SupabaseUserClaims parseAndValidate(String jwt) {
        try {
            if (jwt == null || !jwt.startsWith("eyJ")) {
                return null;
            }

            String[] parts = jwt.split("\\.");
            if (parts.length < 2) {
                return null;
            }

            // Decode Payload (Part 2)
            byte[] payloadBytes = Base64.getUrlDecoder().decode(parts[1]);
            String payloadJson = new String(payloadBytes, StandardCharsets.UTF_8);
            JsonNode root = objectMapper.readTree(payloadJson);

            // 1. Validate Expiration
            if (root.has("exp")) {
                long expSeconds = root.get("exp").asLong();
                Instant exp = Instant.ofEpochSecond(expSeconds);
                if (Instant.now().isAfter(exp)) {
                    log.warn("Supabase JWT has expired at {}", exp);
                    return null;
                }
            }

            // 2. Validate Subject (UUID)
            if (!root.has("sub")) {
                return null;
            }
            UUID userId = UUID.fromString(root.get("sub").asText());

            // 3. Extract Email
            String email = root.has("email") ? root.get("email").asText().toLowerCase().trim() : null;

            // 4. Extract User Metadata (first_name, last_name, etc.)
            String firstName = "User";
            String lastName = "";
            String avatarUrl = null;

            if (root.has("user_metadata") && !root.get("user_metadata").isNull()) {
                JsonNode meta = root.get("user_metadata");
                if (meta.has("first_name") && !meta.get("first_name").asText().isBlank()) {
                    firstName = meta.get("first_name").asText();
                } else if (meta.has("name") && !meta.get("name").asText().isBlank()) {
                    firstName = meta.get("name").asText();
                } else if (meta.has("full_name") && !meta.get("full_name").asText().isBlank()) {
                    firstName = meta.get("full_name").asText();
                }

                if (meta.has("last_name") && !meta.get("last_name").asText().isBlank()) {
                    lastName = meta.get("last_name").asText();
                }

                if (meta.has("avatar_url")) {
                    avatarUrl = meta.get("avatar_url").asText();
                } else if (meta.has("picture")) {
                    avatarUrl = meta.get("picture").asText();
                }
            }

            // 5. Extract Role / Audience
            String role = root.has("role") ? root.get("role").asText() : "authenticated";

            return SupabaseUserClaims.builder()
                    .userId(userId)
                    .email(email)
                    .firstName(firstName)
                    .lastName(lastName)
                    .avatarUrl(avatarUrl)
                    .role(role)
                    .build();

        } catch (Exception ex) {
            log.warn("Failed to validate Supabase JWT: {}", ex.getMessage());
            return null;
        }
    }
}
