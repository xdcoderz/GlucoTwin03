package com.glucotwin.api;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.time.Instant;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

@Component
public class DemoPatientService {
    private final ObjectMapper mapper;
    private final Map<String, JsonNode> roots = new LinkedHashMap<>();
    @Value("${SIMULATED_MEAL_TIME:2026-10-30T12:00:00Z}")
    private String baselineAt = "2026-10-30T12:00:00Z";

    public DemoPatientService(ObjectMapper mapper) { this.mapper = mapper; }

    @PostConstruct
    void load() throws IOException {
        for (String fixture : List.of("demo_patient_001.json", "demo_patient_002.json")) {
            JsonNode root = mapper.readTree(new ClassPathResource(fixture).getInputStream());
            if (!root.path("provenance").path("synthetic").asBoolean(false)
                    || root.path("provenance").path("containsRealPatientData").asBoolean(true)) {
                throw new IllegalStateException("Public demo fixture must be explicitly synthetic");
            }
            String patientId = root.path("patient").path("patientId").asText();
            if (patientId.isBlank() || roots.putIfAbsent(patientId, root) != null) {
                throw new IllegalStateException("Each demo fixture needs a unique synthetic patient ID");
            }
        }
    }

    public boolean isKnownPatient(String patientId) { return roots.containsKey(patientId); }
    public JsonNode patientNode(String patientId) { return root(patientId).path("patient"); }
    public JsonNode mealNode(String patientId) { return root(patientId).path("currentMeal"); }

    public Map<String, Object> patient(String patientId) {
        return mapper.convertValue(patientNode(patientId), new TypeReference<>() {});
    }
    public Map<String, Object> meal(String patientId) {
        Map<String, Object> meal = mapper.convertValue(mealNode(patientId), new TypeReference<>() {});
        meal.put("mealId", mealId(patientId));
        meal.put("baselineAt", baselineAt().toString());
        meal.put("clockMode", "synthetic_replay");
        return meal;
    }
    public Instant baselineAt() { return Instant.parse(baselineAt); }
    public String mealId(String patientId) { return patientId + "-MEAL-" + baselineAt().toEpochMilli(); }
    public List<PatientSummary> patients() {
        return roots.keySet().stream().map(id -> new PatientSummary(id, patientNode(id).path("displayName").asText())).toList();
    }
    private JsonNode root(String patientId) {
        JsonNode root = roots.get(patientId);
        if (root == null) throw new IllegalArgumentException("Unknown synthetic patient");
        return root;
    }
}
