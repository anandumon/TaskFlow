package com.taskflow.identity.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateProfileRequest {

    @Size(max = 100)
    private String firstName;

    @Size(max = 100)
    private String lastName;

    @Size(max = 200)
    private String displayName;

    @Size(max = 500)
    private String bio;

    @Size(max = 200)
    private String jobTitle;

    @Size(max = 50)
    private String timezone;

    @Size(max = 10)
    private String language;

    @Size(max = 200)
    private String department;

    @Size(max = 20)
    private String availability;
}
