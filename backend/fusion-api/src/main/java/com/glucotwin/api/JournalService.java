package com.glucotwin.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class JournalService {
    private final JournalRepository entries;
    private final ReviewRepository reviews;
    private final DemoPatientService demo;
    private final CgmService cgm;
    private final ObjectMapper mapper;

    public JournalService(JournalRepository entries, ReviewRepository reviews, DemoPatientService demo, CgmService cgm, ObjectMapper mapper) {
        this.entries = entries; this.reviews = reviews; this.demo = demo; this.cgm = cgm; this.mapper = mapper;
    }

    public List<CgmReading> history(String patientId) {
        Instant t0 = demo.baselineAt();
        var unique = new LinkedHashMap<String, CgmReading>();
        cgm.readings(patientId).stream().filter(row -> !row.getObservedAt().isAfter(t0) && !row.getObservedAt().isBefore(t0.minus(Duration.ofMinutes(120))))
            .forEach(row -> unique.putIfAbsent(row.getObservedAt() + "/" + row.getGlucoseMgDl(), row));
        return List.copyOf(unique.values());
    }

    public List<String> quality(List<CgmReading> history) {
        return quality(history, demo.baselineAt());
    }
    private List<String> quality(List<CgmReading> history, Instant baselineAt) {
        var issues = new ArrayList<String>();
        var expected = new HashSet<Instant>();
        for (int minute = 0; minute <= 120; minute += 15) {
            Instant at = baselineAt.minus(Duration.ofMinutes(minute));
            expected.add(at);
            var values = history.stream().filter(row -> row.getObservedAt().equals(at)).map(CgmReading::getGlucoseMgDl).distinct().toList();
            if (values.isEmpty()) issues.add("missing_history_offset_" + minute);
            else if (values.size() > 1) issues.add("conflicting_history_offset_" + minute);
        }
        if (history.stream().anyMatch(row -> !Double.isFinite(row.getGlucoseMgDl()))) issues.add("non_finite_history");
        if (history.stream().anyMatch(row -> row.getGlucoseMgDl() < 40 || row.getGlucoseMgDl() > 500)) issues.add("out_of_range_history");
        if (history.stream().anyMatch(row -> !expected.contains(row.getObservedAt()))) issues.add("off_grid_history");
        return issues;
    }

    public JsonNode inputSnapshot(String patientId, List<CgmReading> history) {
        var input = new LinkedHashMap<String, Object>();
        input.put("patient", demo.patient(patientId)); input.put("currentMeal", demo.meal(patientId));
        input.put("cgmHistory", history.stream().map(JournalService::readingView).toList());
        return mapper.valueToTree(input);
    }

    public String hash(JsonNode input) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(mapper.writeValueAsString(input).getBytes(StandardCharsets.UTF_8))); }
        catch (Exception error) { throw new IllegalStateException("Cannot fingerprint input", error); }
    }

    public JournalEntry save(String patientId, JsonNode input, PredictionResponse prediction) {
        try {
            var row = new JournalEntry();
            row.predictionId = UUID.randomUUID().toString(); row.patientId = patientId; row.mealId = demo.mealId(patientId);
            row.baselineAt = demo.baselineAt(); row.inputHash = hash(input);
            // Recheck after inference: observations arriving while a model call runs
            // cannot be counted as prospectively collected after the issued result.
            var existing = cgm.readings(patientId);
            row.observationCutoffId = existing.stream().map(CgmReading::getId).filter(Objects::nonNull).mapToLong(Long::longValue).max().orElse(0);
            row.prospective = existing.stream().noneMatch(r -> r.getObservedAt().isAfter(row.baselineAt) && !r.getObservedAt().isAfter(row.baselineAt.plus(Duration.ofMinutes(120))));
            row.computedAt = Instant.now();
            var snapshot = input.deepCopy(); ((com.fasterxml.jackson.databind.node.ObjectNode) snapshot).set("prediction", mapper.valueToTree(prediction));
            row.snapshotJson = mapper.writeValueAsString(snapshot); row.predictionJson = mapper.writeValueAsString(prediction);
            return entries.saveAndFlush(row);
        } catch (Exception error) { throw new IllegalStateException("Could not save prediction record", error); }
    }

    public JournalEntry latestEntry(String patientId) {
        if (!demo.isKnownPatient(patientId)) throw new IllegalArgumentException("Unknown synthetic patient");
        return entries.findFirstByPatientIdAndMealIdOrderBySequenceDesc(patientId, demo.mealId(patientId)).orElse(null);
    }

    public PredictionResponse prediction(JournalEntry row) {
        try { return mapper.readValue(row.predictionJson, PredictionResponse.class); }
        catch (Exception error) { throw new IllegalStateException("Invalid stored prediction", error); }
    }

    public JournalView latest(String patientId) { return view(latestEntry(patientId), patientId); }
    public JournalView get(String predictionId) {
        JournalEntry entry = entries.findByPredictionId(predictionId).orElseThrow(() -> new IllegalArgumentException("Unknown saved prediction"));
        return view(entry, entry.patientId);
    }
    public List<JournalView> worklist() { return demo.patients().stream().map(p -> latest(p.patientId())).toList(); }
    public List<JournalView> historyEntries(String patientId) {
        latestEntry(patientId); // Validate patient even if its journal is empty.
        return entries.findByPatientIdOrderBySequenceDesc(patientId).stream().map(row -> view(row, patientId)).toList();
    }

    public JournalView review(String predictionId, String action, String note) {
        get(predictionId);
        if (action == null || !List.of("reviewed", "reopened").contains(action)) throw new IllegalArgumentException("Review action must be reviewed or reopened");
        if (note == null || note.isBlank() || note.length() > 1000) throw new IllegalArgumentException("Review note must contain 1 to 1000 characters");
        JournalReview review = new JournalReview(); review.predictionId = predictionId; review.recordedAt = Instant.now(); review.action = action; review.note = note.strip();
        reviews.saveAndFlush(review);
        return get(predictionId);
    }

    private JournalView view(JournalEntry row, String patientId) {
        try {
            JsonNode input = row == null ? inputSnapshot(patientId, history(patientId)) : mapper.readTree(row.snapshotJson);
            PredictionResponse prediction = row == null ? PredictionResponse.pending() : prediction(row);
            Instant t0 = row == null ? demo.baselineAt() : row.baselineAt;
            var savedHistory = new ArrayList<CgmReading>();
            for (JsonNode r : input.path("cgmHistory")) savedHistory.add(new CgmReading(r.path("eventId").asText(), patientId, Instant.parse(r.path("observedAt").asText()), r.path("glucoseMgDl").asDouble(), r.path("source").asText()));
            var bases = savedHistory.stream().filter(r -> r.getObservedAt().equals(t0)).map(CgmReading::getGlucoseMgDl).distinct().toList();
            Double base = bases.size() == 1 ? bases.getFirst() : null;
            var reviewRows = row == null ? List.<JournalReview>of() : reviews.findByPredictionIdOrderByIdAsc(row.predictionId);
            var last = latestEntry(patientId);
            boolean changed = row != null && !row.inputHash.equals(hash(inputSnapshot(patientId, history(patientId))));
            return new JournalView(row == null ? null : row.predictionId, patientId, input.path("patient").path("displayName").asText(), row == null ? demo.mealId(patientId) : row.mealId,
                t0, row == null ? null : row.computedAt, t0.plus(Duration.ofMinutes(120)), "synthetic_replay", row == null ? hash(input) : row.inputHash,
                row != null && prospective(row), row != null && last != null && !row.predictionId.equals(last.predictionId), changed, base, base != null && base >= 180,
                quality(savedHistory, t0), prediction, input, outcome(row, patientId, t0, base, prediction, changed),
                reviewRows.isEmpty() ? "awaiting_review" : reviewRows.getLast().action.equals("reviewed") ? "reviewed" : "awaiting_review",
                reviewRows.stream().map(r -> new JournalView.Review(r.recordedAt, r.action, r.note)).toList());
        } catch (Exception error) { throw new IllegalStateException("Cannot read saved research record", error); }
    }

    private JournalView.Outcome outcome(JournalEntry row, String patientId, Instant baselineAt, Double base, PredictionResponse prediction, boolean changed) {
        Instant end = baselineAt.plus(Duration.ofMinutes(120));
        var groups = new TreeMap<Instant, List<CgmReading>>();
        cgm.readings(patientId).stream().filter(r -> r.getObservedAt().isAfter(baselineAt) && !r.getObservedAt().isAfter(end)).forEach(r -> groups.computeIfAbsent(r.getObservedAt(), ignored -> new ArrayList<>()).add(r));
        int conflicts = 0; var valid = new ArrayList<CgmReading>();
        for (var group : groups.values()) {
            if (group.stream().map(CgmReading::getGlucoseMgDl).distinct().count() != 1 || group.stream().anyMatch(r -> !Double.isFinite(r.getGlucoseMgDl()))) conflicts++;
            else valid.add(group.getFirst());
        }
        int samples = 0;
        for (int minute = 15; minute <= 120; minute += 15) {
            Instant expected = baselineAt.plus(Duration.ofMinutes(minute));
            if (valid.stream().anyMatch(r -> r.getObservedAt().equals(expected))) samples++;
        }
        boolean complete = samples == 8 && conflicts == 0;
        Double max = valid.stream().map(CgmReading::getGlucoseMgDl).max(Double::compare).orElse(null);
        Double rise = max == null || base == null ? null : max - base;
        boolean reached = max != null && max >= 180, rose = rise != null && rise >= 40;
        Boolean event = reached || rose ? Boolean.TRUE : complete && base != null ? Boolean.FALSE : null;
        String status = event == Boolean.TRUE ? "event_observed" : complete && base != null ? "no_event_observed_complete" : groups.containsKey(end) ? "insufficient_follow_up" : valid.isEmpty() ? "awaiting_outcome" : "partial_follow_up";
        boolean comparable = row != null && prospective(row) && !changed && "available".equals(prediction.status()) && prediction.predictedEvent() != null && event != null;
        // An early-arriving future reading makes the whole attempt retrospective.
        if (row != null && valid.stream().anyMatch(r -> r.getId() != null && r.getId() <= row.observationCutoffId)) comparable = false;
        return new JournalView.Outcome(status, 8, samples, complete, conflicts, event,
            reached ? Boolean.TRUE : complete ? Boolean.FALSE : null, rise == null ? null : rose ? Boolean.TRUE : complete ? Boolean.FALSE : null, max, rise,
            comparable ? prediction.predictedEvent().equals(event) : null,
            valid.stream().map(JournalService::readingView).toList(),
            "Fictional synthetic follow-up; not generated by the model. Complete means eight 15-minute samples, not continuous coverage. Missing samples cannot establish a negative outcome.");
    }

    private boolean prospective(JournalEntry row) {
        return row.prospective && cgm.readings(row.patientId).stream()
            .filter(r -> r.getObservedAt().isAfter(row.baselineAt) && !r.getObservedAt().isAfter(row.baselineAt.plus(Duration.ofMinutes(120))))
            .noneMatch(r -> r.getReceivedAt() == null || !r.getReceivedAt().isAfter(row.computedAt));
    }
    public static CgmReadingView readingView(CgmReading r) { return new CgmReadingView(r.getEventId(), r.getObservedAt(), r.getGlucoseMgDl(), r.getSource(), r.getReceivedAt()); }
}
