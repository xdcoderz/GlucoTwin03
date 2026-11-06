package com.glucotwin.api;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record PredictionResponse(
    String status,
    @JsonProperty("model_score") Double modelScore,
    @JsonProperty("horizon_minutes") Integer horizonMinutes,
    Double threshold,
    @JsonProperty("predicted_event") Boolean predictedEvent,
    @JsonProperty("model_version") String modelVersion,
    @JsonProperty("top_factors") List<PredictionFactor> topFactors,
    String reason
) {
    public static PredictionResponse pending() {
        return new PredictionResponse("pending", null, 120, null, null, null, List.of(), "prediction_not_requested");
    }
    public static PredictionResponse insufficient(String reason) {
        return new PredictionResponse("insufficient_data", null, 120, null, null, null, List.of(), reason);
    }
    public static PredictionResponse unavailable(String reason) {
        return new PredictionResponse("unavailable", null, 120, null, null, null, List.of(), reason);
    }
}
