package com.glucotwin.api;

import jakarta.validation.constraints.*;
import java.util.List;

public record MealSimulationRequest(
    @NotBlank @Size(max=500) String description,
    @NotNull @Size(max=8) List<@NotNull @Pattern(regexp="rice|noodle|bread|vegetable|animal_protein|fruit|dairy|root_or_corn") String> categories,
    @NotNull @DecimalMin("1") @DecimalMax("2000") Double portionGrams,
    @NotNull @Min(0) @Max(1440) Integer minutesSincePreviousMeal
) {}
