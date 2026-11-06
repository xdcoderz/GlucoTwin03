package com.glucotwin.api;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@Validated
public class PatientController {
    private final DemoPatientService demo;
    private final CgmService cgm;
    private final PredictionService predictions;
    private final JournalService journal;

    public PatientController(DemoPatientService demo, CgmService cgm, PredictionService predictions, JournalService journal) {
        this.demo = demo; this.cgm = cgm; this.predictions = predictions; this.journal = journal;
    }

    @PostMapping("/cgm/events")
    public ResponseEntity<CgmIngestResponse> ingest(@jakarta.validation.Valid @RequestBody CgmEventRequest request) {
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(cgm.ingest(request));
    }

    @GetMapping("/patients")
    public List<PatientSummary> patients() { return demo.patients(); }

    @GetMapping("/patients/{id}")
    public PatientView patient(@PathVariable String id) {
        requireKnown(id);
        List<CgmReadingView> history = journal.history(id).stream()
            .map(r -> new CgmReadingView(r.getEventId(), r.getObservedAt(), r.getGlucoseMgDl(), r.getSource())).toList();
        JournalView saved = journal.latest(id);
        return new PatientView(demo.patient(id), demo.meal(id), history, saved.prediction(), saved);
    }

    @GetMapping("/patients/{id}/cgm")
    public List<CgmReadingView> cgm(@PathVariable String id) {
        requireKnown(id);
        return cgm.readings(id).stream().map(JournalService::readingView).toList();
    }

    @PostMapping("/patients/{id}/refresh")
    public PredictionResponse refresh(@PathVariable String id) { return predictions.refresh(id); }

    @GetMapping("/patients/{id}/prediction")
    public PredictionResponse prediction(@PathVariable String id) { return predictions.latest(id); }

    private void requireKnown(String id) {
        if (!demo.isKnownPatient(id)) throw new IllegalArgumentException("Unknown synthetic patient");
    }
}
