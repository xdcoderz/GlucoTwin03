package com.glucotwin.api;

import org.springframework.stereotype.Service;

@Service
public class PredictionService {
    private final DemoPatientService demo;
    private final FeatureBuilder featureBuilder;
    private final PredictionClient client;
    private final JournalService journal;

    public PredictionService(DemoPatientService demo, FeatureBuilder featureBuilder, PredictionClient client, JournalService journal) {
        this.demo = demo; this.featureBuilder = featureBuilder; this.client = client; this.journal = journal;
    }

    public PredictionResponse latest(String patientId) {
        var row = journal.latestEntry(patientId);
        return row == null ? PredictionResponse.pending() : journal.prediction(row);
    }

    public synchronized PredictionResponse refresh(String patientId) {
        var history = journal.history(patientId);
        var input = journal.inputSnapshot(patientId, history);
        PredictionResponse result;
        var issues = journal.quality(history);
        if (!issues.isEmpty()) result = PredictionResponse.insufficient(String.join(",", issues));
        else {
            result = scoreFeatures(featureBuilder.build(demo.patientNode(patientId), demo.mealNode(patientId), history));
        }
        journal.save(patientId, input, result);
        return result;
    }

    /** Shared model call and response validation for recorded and what-if inputs. */
    PredictionResponse scoreFeatures(java.util.Map<String, Double> features) {
        PredictionResponse result;
            try {
                result = client.predict(features);
                if (result == null) result = PredictionResponse.unavailable("empty_model_response");
                else if ("available".equals(result.status()) && (result.modelScore() == null || !Double.isFinite(result.modelScore())
                    || result.modelScore() < 0 || result.modelScore() > 1 || result.horizonMinutes() == null || result.horizonMinutes() != 120
                    || result.threshold() == null || !Double.isFinite(result.threshold()) || result.threshold() != .5
                    || result.predictedEvent() == null || result.predictedEvent() != (result.modelScore() >= result.threshold())
                    || result.modelVersion() == null || result.modelVersion().isBlank() || result.topFactors() == null
                    || result.topFactors().stream().anyMatch(f -> f == null || f.feature() == null || f.feature().isBlank()
                        || !Double.isFinite(f.contribution()) || !(f.contribution() >= 0 ? "up" : "down").equals(f.direction())))) {
                    result = PredictionResponse.unavailable("invalid_model_response");
                } else if (!"available".equals(result.status())) result = PredictionResponse.unavailable("model_did_not_return_available_score");
            } catch (Exception error) { result = PredictionResponse.unavailable("model_service_unreachable_or_invalid"); }
        return result;
    }
}
