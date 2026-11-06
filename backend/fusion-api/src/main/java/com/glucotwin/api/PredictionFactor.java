package com.glucotwin.api;

import com.fasterxml.jackson.annotation.JsonProperty;

public record PredictionFactor(
    String feature,
    double contribution,
    String direction
) {}
