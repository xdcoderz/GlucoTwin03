package com.glucotwin.api;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

/** Read-only workflow state. A successful health probe does not guarantee the next score. */
@RestController
public class ReadinessController {
    private final DemoPatientService demo;
    private final JournalService journal;
    private final CgmService cgm;
    private final PredictionClient client;
    public ReadinessController(DemoPatientService demo, JournalService journal, CgmService cgm, PredictionClient client) {
        this.demo = demo; this.journal = journal; this.cgm = cgm; this.client = client;
    }
    public record Slot(int minutesBefore, Instant observedAt, String status, Double glucoseMgDl) {}
    public record Readiness(String patientId, Instant serverTime, Instant baselineAt, String clockMode,
        boolean historyReady, int receivedExpectedSamples, int expectedSamples, List<Slot> historySlots,
        List<String> qualityIssues, Instant latestReceivedAt, PredictionClient.ModelStatus model,
        String predictionId, String predictionStatus, Instant computedAt, boolean inputChanged,
        int followUpSamples, boolean followUpComplete, String reviewState, String nextAction) {}

    @GetMapping("/api/patients/{id}/readiness")
    public Readiness readiness(@PathVariable String id) {
        var history = journal.history(id); // validates patient before any model call
        var issues = journal.quality(history);
        var slots = new ArrayList<Slot>();
        for (int minute = 120; minute >= 0; minute -= 15) {
            var at = demo.baselineAt().minus(Duration.ofMinutes(minute));
            var values = history.stream().filter(row -> row.getObservedAt().equals(at)).map(CgmReading::getGlucoseMgDl).distinct().toList();
            boolean valid = values.size() == 1 && Double.isFinite(values.getFirst()) && values.getFirst() >= 40 && values.getFirst() <= 500;
            slots.add(new Slot(minute, at, values.isEmpty() ? "missing" : valid ? "received" : "conflict", valid ? values.getFirst() : null));
        }
        var latest = journal.latest(id);
        var model = client.health();
        String next = !issues.isEmpty() ? "history" : latest.predictionId() == null || latest.inputChanged() || !"available".equals(latest.prediction().status())
            ? "score" : !latest.outcome().complete() ? "follow_up" : !"reviewed".equals(latest.reviewState()) ? "review" : "complete";
        return new Readiness(id, Instant.now(), demo.baselineAt(), "synthetic_replay", issues.isEmpty(),
            (int)slots.stream().filter(s -> s.status().equals("received")).count(), 9, slots, issues,
            cgm.readings(id).stream().map(CgmReading::getReceivedAt).filter(java.util.Objects::nonNull).max(Instant::compareTo).orElse(null),
            model, latest.predictionId(), latest.prediction().status(), latest.computedAt(), latest.inputChanged(),
            latest.outcome().receivedSamples(), latest.outcome().complete(), latest.reviewState(), next);
    }
}
