package com.taskflow.identity.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class SupabaseUserProvisioner {

    private final JdbcTemplate jdbcTemplate;

    /**
     * Provisions or updates a user directly into Supabase's auth.users and auth.identities
     * with standard bcrypt hashed password so Supabase signInWithPassword works natively.
     */
    public UUID provisionAuthUser(String email, String rawPassword, String firstName, String lastName) {
        try {
            String cleanEmail = email.toLowerCase().trim();

            // Check if user already exists in auth.users
            String checkSql = "SELECT id FROM auth.users WHERE email = ? LIMIT 1";
            List<UUID> existing = jdbcTemplate.query(
                    checkSql,
                    (rs, rowNum) -> UUID.fromString(rs.getString("id")),
                    cleanEmail
            );

            if (!existing.isEmpty()) {
                UUID existingId = existing.get(0);
                String updateSql = "UPDATE auth.users SET email_confirmed_at = COALESCE(email_confirmed_at, now()), " +
                                   "encrypted_password = crypt(?, gen_salt('bf')), " +
                                   "updated_at = now() WHERE id = ?";
                jdbcTemplate.update(updateSql, rawPassword, existingId);
                log.info("✔ [SUPABASE PROVISIONER] Updated existing user in Supabase auth.users: {}", cleanEmail);
                return existingId;
            }

            UUID newUserId = UUID.randomUUID();
            String insertUserSql =
                    "INSERT INTO auth.users (" +
                    "  id, instance_id, email, encrypted_password, email_confirmed_at, " +
                    "  raw_app_meta_data, raw_user_meta_data, role, aud, created_at, updated_at " +
                    ") VALUES (" +
                    "  ?, '00000000-0000-0000-0000-000000000000'::uuid, ?, crypt(?, gen_salt('bf')), now(), " +
                    "  '{\"provider\":\"email\",\"providers\":[\"email\"]}'::jsonb, " +
                    "  jsonb_build_object('first_name', ?, 'last_name', ?, 'name', ?), " +
                    "  'authenticated', 'authenticated', now(), now()" +
                    ")";

            String fullName = (firstName + " " + lastName).trim();
            jdbcTemplate.update(insertUserSql, newUserId, cleanEmail, rawPassword, firstName, lastName, fullName);

            String insertIdentitySql =
                    "INSERT INTO auth.identities (" +
                    "  id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at " +
                    ") VALUES (" +
                    "  ?, ?, jsonb_build_object('sub', ?, 'email', ?), 'email', ?, now(), now(), now()" +
                    ") ON CONFLICT DO NOTHING";

            jdbcTemplate.update(insertIdentitySql, newUserId, newUserId, newUserId.toString(), cleanEmail, cleanEmail);

            log.info("✔ [SUPABASE PROVISIONER] Created new user in Supabase auth.users: {} (ID: {})", cleanEmail, newUserId);
            return newUserId;
        } catch (Exception ex) {
            log.warn("Could not provision directly to auth.users: {}", ex.getMessage());
            return null;
        }
    }
}
