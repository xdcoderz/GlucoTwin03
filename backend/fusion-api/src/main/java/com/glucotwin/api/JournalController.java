package com.glucotwin.api;

import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;
import java.time.Duration;

@RestController
@RequestMapping("/api")
public class JournalController {
    private final JournalService journal;
    private final DemoPatientService demo;
    private final CgmService cgm;
    private final JsonNode followUp;
    public JournalController(JournalService journal, DemoPatientService demo, CgmService cgm, ObjectMapper mapper) throws Exception {
        this.journal = journal; this.demo = demo; this.cgm = cgm;
        try (var stream = new ClassPathResource("follow_up_synthetic.json").getInputStream()) { followUp = mapper.readTree(stream); }
        if (!followUp.path("synthetic").asBoolean(false)) throw new IllegalStateException("Follow-up must be explicitly synthetic");
    }
    @GetMapping("/worklist") public List<JournalView> worklist() { return journal.worklist(); }
    @GetMapping("/patients/{id}/journal") public List<JournalView> history(@PathVariable String id) { return journal.historyEntries(id); }
    @GetMapping("/journal/{id}") public JournalView record(@PathVariable String id) { return journal.get(id); }
    public record ReviewRequest(String action, String note) {}
    @PostMapping("/journal/{id}/reviews") public JournalView review(@PathVariable String id, @RequestBody ReviewRequest request) {
        return journal.review(id, request.action(), request.note());
    }
    public record ReplayRequest(String stage) {}
    @PostMapping("/demo/patients/{id}/follow-up") public Map<String, Object> replay(@PathVariable String id, @RequestBody ReplayRequest request) {
        if (journal.latestEntry(id) == null) throw new ResponseStatusException(HttpStatus.CONFLICT, "Save a scoring attempt before replaying follow-up");
        if (request.stage() == null || !List.of("partial", "complete", "gap").contains(request.stage())) throw new IllegalArgumentException("Replay stage must be partial, complete or gap");
        int accepted = 0, duplicates = 0;
        JsonNode values = followUp.path("patients").path(id);
        for (int index = 0; index < 8; index++) {
            int minute = (index + 1) * 15;
            if (request.stage().equals("partial") && minute > 45 || request.stage().equals("gap") && minute == 60) continue;
            var event = new CgmEventRequest(id, demo.mealId(id) + "-FOLLOWUP-" + minute, demo.baselineAt().plus(Duration.ofMinutes(minute)), values.get(index).asDouble(), "synthetic-follow-up-replay");
            if (cgm.ingest(event).status().equals("accepted")) accepted++; else duplicates++;
        }
        return Map.of("synthetic", true, "stage", request.stage(), "accepted", accepted, "duplicates", duplicates, "modelScored", false);
    }
}
