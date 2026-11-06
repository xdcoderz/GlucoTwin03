package com.glucotwin.api;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import java.util.List;

public record JournalView(
    String predictionId, String patientId, String displayName, String mealId,
    Instant baselineAt, Instant computedAt, Instant horizonEnd, String clockMode,
    String inputHash, boolean prospective, boolean superseded, boolean inputChanged,
    Double baselineGlucoseMgDl, boolean baselineAlreadyHigh, List<String> qualityIssues,
    PredictionResponse prediction, JsonNode snapshot, Outcome outcome,
    String reviewState, List<Review> reviews
) {
    public record Review(Instant recordedAt, String action, String note) {}
    public record Outcome(String status, int expectedSamples, int receivedSamples, boolean complete,
        int conflictingTimestamps, Boolean eventObserved, Boolean reaches180, Boolean rises40,
        Double observedMaxMgDl, Double observedRiseMgDl, Boolean predictionMatched,
        List<CgmReadingView> readings, String note) {}
}
