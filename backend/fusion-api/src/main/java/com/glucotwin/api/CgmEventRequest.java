package com.glucotwin.api;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;

public record CgmEventRequest(
    @NotBlank @Size(max=80) String patientId,
    @NotBlank @Size(max=120) String eventId,
    @NotNull Instant observedAt,
    @NotNull @DecimalMin("40.0") @DecimalMax("500.0") Double glucoseMgDl,
    @NotBlank @Size(max=80) String source
) {}


