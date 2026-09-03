package com.taskflow.common.security;

import lombok.Getter;
import lombok.Setter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Getter
@Setter
public class UserPrincipal implements UserDetails {

    private UUID id;
    private String email;
    private String password;
    private String firstName;
    private String lastName;
    private boolean emailVerified;
    private boolean accountLocked;
    private Set<String> permissions;

    public UserPrincipal(UUID id, String email, String password,
                         String firstName, String lastName,
                         boolean emailVerified, boolean accountLocked,
                         Set<String> permissions) {
        this.id = id;
        this.email = email;
        this.password = password;
        this.firstName = firstName;
        this.lastName = lastName;
        this.emailVerified = emailVerified;
        this.accountLocked = accountLocked;
        this.permissions = permissions;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return permissions.stream()
                .map(SimpleGrantedAuthority::new)
                .collect(Collectors.toSet());
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return !accountLocked;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }

    public boolean hasPermission(String permission) {
        return permissions.contains(permission);
    }
}
