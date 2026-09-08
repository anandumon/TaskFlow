package com.taskflow.common.security;

import com.taskflow.common.tenant.TenantContext;
import com.taskflow.identity.entity.User;
import com.taskflow.identity.repository.UserRepository;
import com.taskflow.rbac.repository.RolePermissionRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtProvider jwtProvider;
    private final SupabaseJwtValidator supabaseJwtValidator;
    private final UserRepository userRepository;
    private final RolePermissionRepository rolePermissionRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        try {
            String jwt = extractJwtFromRequest(request);

            if (StringUtils.hasText(jwt)) {
                // 1. First attempt Supabase Auth JWT validation
                SupabaseJwtValidator.SupabaseUserClaims sbClaims = supabaseJwtValidator.parseAndValidate(jwt);

                if (sbClaims != null && sbClaims.getUserId() != null) {
                    UUID authUserId = sbClaims.getUserId();
                    String email = sbClaims.getEmail();

                    // Find or provision User in TaskFlow application database
                    User user = null;
                    Optional<User> userOpt = userRepository.findByAuthUserIdAndDeletedFalse(authUserId);
                    if (userOpt.isPresent()) {
                        user = userOpt.get();
                    } else if (email != null) {
                        Optional<User> emailUserOpt = userRepository.findByEmailAndDeletedFalse(email);
                        if (emailUserOpt.isPresent()) {
                            user = emailUserOpt.get();
                            user.setAuthUserId(authUserId);
                            user.setEmailVerified(true);
                            user = userRepository.save(user);
                        }
                    }

                    // Unregistered users must explicitly register via signup flow
                    if (user == null) {
                        log.debug("[SUPABASE AUTH] User {} is not registered in TaskFlow database.", email);
                    }

                    if (user != null) {
                        if (user.getLockedUntil() != null && user.getLockedUntil().isAfter(java.time.Instant.now())) {
                            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                            return;
                        }

                        Set<String> permissions = Collections.emptySet();
                        try {
                            permissions = rolePermissionRepository.findPermissionCodesByUserId(user.getId());
                        } catch (Exception permEx) {
                            log.debug("Permissions lookup fallback for user: {}", user.getId());
                        }

                        UserPrincipal principal = new UserPrincipal(
                                user.getId(),
                                user.getEmail(),
                                user.getPasswordHash() != null ? user.getPasswordHash() : "",
                                user.getFirstName(),
                                user.getLastName(),
                                user.isEmailVerified(),
                                false,
                                permissions
                        );

                        UsernamePasswordAuthenticationToken authentication =
                                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
                        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                        SecurityContextHolder.getContext().setAuthentication(authentication);
                        TenantContext.setUserId(user.getId());
                    }
                }
                // 2. Fallback to TaskFlow native JWT Provider
                else if (jwtProvider.validateToken(jwt)) {
                    UUID userId = jwtProvider.getUserIdFromToken(jwt);
                    Optional<User> userOpt = userRepository.findByIdAndDeletedFalse(userId);
                    if (userOpt.isPresent()) {
                        User user = userOpt.get();

                        if (user.getLockedUntil() != null && user.getLockedUntil().isAfter(java.time.Instant.now())) {
                            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                            return;
                        }

                        Set<String> permissions = rolePermissionRepository.findPermissionCodesByUserId(userId);

                        UserPrincipal principal = new UserPrincipal(
                                user.getId(),
                                user.getEmail(),
                                user.getPasswordHash(),
                                user.getFirstName(),
                                user.getLastName(),
                                user.isEmailVerified(),
                                false,
                                permissions
                        );

                        UsernamePasswordAuthenticationToken authentication =
                                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
                        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                        SecurityContextHolder.getContext().setAuthentication(authentication);
                        TenantContext.setUserId(userId);
                    }
                }
            }
        } catch (Exception ex) {
            log.error("Could not set user authentication in security context", ex);
        } finally {
            try {
                filterChain.doFilter(request, response);
            } finally {
                TenantContext.clear();
            }
        }
    }

    private String extractJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}
