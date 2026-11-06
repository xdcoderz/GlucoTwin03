package com.glucotwin.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class FeatureBuilderTest {
    private final ObjectMapper mapper = new ObjectMapper();
    private final FeatureBuilder builder = new FeatureBuilder();
    private final Instant baseline = Instant.parse("2026-10-30T12:00:00Z");

    private JsonNode fixture(String name) throws Exception {
        try (var stream = getClass().getResourceAsStream("/" + name)) {
            return mapper.readTree(stream);
        }
    }

    private List<CgmReading> history(JsonNode fixture) {
        var readings = new ArrayList<CgmReading>();
        for (JsonNode row : fixture.path("cgmHistory")) {
            int lag = row.path("minutesBefore").asInt();
            readings.add(new CgmReading("fixture-" + lag, fixture.path("patient").path("patientId").asText(), baseline.minus(lag, ChronoUnit.MINUTES), row.path("glucoseMgDl").asDouble(), "synthetic-cgm-replay"));
        }
        return readings;
    }

    @Test
    void bothScenariosMatchFrozen43FeatureContract() throws Exception {
        Path root = Path.of("").toAbsolutePath();
        while (root != null && !Files.exists(root.resolve("contracts/v1.json"))) root = root.getParent();
        assertNotNull(root, "Run tests from inside the project tree");
        var contract = mapper.readTree(root.resolve("contracts/v1.json").toFile());
        var expected = new HashSet<String>();
        contract.path("featureNames").forEach(node -> expected.add(node.asText()));
        for (String name : List.of("demo_patient_001.json", "demo_patient_002.json")) {
            JsonNode fixture = fixture(name);
            var features = builder.build(fixture.path("patient"), fixture.path("currentMeal"), history(fixture));
            assertEquals(43, features.size());
            assertEquals(expected, features.keySet());
            assertEquals(9.0, features.get("glucose_observations_prev_120_min"));
            assertEquals(0.0, features.get("meal_is_weekend"));
            assertEquals(fixture.path("patient").path("ageYears").asDouble(), features.get("age_years"));
        }
    }

    @Test
    void lowerScenarioUsesHistoryThroughMealBaseline() throws Exception {
        JsonNode fixture = fixture("demo_patient_001.json");
        var features = builder.build(fixture.path("patient"), fixture.path("currentMeal"), history(fixture));
        assertEquals(142.0, features.get("baseline_glucose_mg_dl"));
        assertEquals(136.0, features.get("glucose_lag_15_min_mg_dl"));
        assertEquals(30.0, features.get("glucose_change_prev_120_min_mg_dl"));
        assertEquals(330.0, features.get("reported_food_weight_g"));
        assertEquals(1.0, features.get("meal_contains_rice"));
        assertEquals(0.0, features.get("meal_contains_bread"));
        assertEquals(1.0, features.get("has_recorded_non_insulin_medication_at_meal"));
    }

    @Test
    void highScenarioHasDistinctPreMealInputs() throws Exception {
        JsonNode fixture = fixture("demo_patient_002.json");
        var features = builder.build(fixture.path("patient"), fixture.path("currentMeal"), history(fixture));
        assertEquals(190.0, features.get("baseline_glucose_mg_dl"));
        assertEquals(70.0, features.get("glucose_change_prev_120_min_mg_dl"));
        assertEquals(1.0, features.get("meal_contains_bread"));
        assertEquals(1.0, features.get("meal_contains_root_or_corn"));
    }

    @Test
    void incompleteHistoryCannotBeScored() throws Exception {
        JsonNode fixture = fixture("demo_patient_001.json");
        var readings = history(fixture);
        readings.remove(0);
        assertThrows(IllegalStateException.class, () -> builder.build(fixture.path("patient"), fixture.path("currentMeal"), readings));
    }

    @Test
    void missingExactLagCannotBeScored() throws Exception {
        JsonNode fixture = fixture("demo_patient_001.json");
        var readings = history(fixture);
        readings.remove(7);
        readings.add(new CgmReading("off-grid", "DEMO-001", baseline.minus(16, ChronoUnit.MINUTES), 136.0, "synthetic-cgm-replay"));
        assertThrows(IllegalStateException.class, () -> builder.build(fixture.path("patient"), fixture.path("currentMeal"), readings));
    }
}
