package com.glucotwin.api;

import java.util.List;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

@Service
public class CgmService {
    private final CgmReadingRepository repository;
    private final DemoPatientService demo;

    public CgmService(CgmReadingRepository repository, DemoPatientService demo) {
        this.repository = repository;
        this.demo = demo;
    }

    public CgmIngestResponse ingest(CgmEventRequest request) {
        if (!demo.isKnownPatient(request.patientId())) {
            throw new IllegalArgumentException("Unknown synthetic demo patient");
        }
        if (request.glucoseMgDl() == null || !Double.isFinite(request.glucoseMgDl()) || request.glucoseMgDl() < 40 || request.glucoseMgDl() > 500.0) {
            throw new IllegalArgumentException("glucoseMgDl must be finite and between 40 and 500");
        }
        if (request.eventId() == null || request.eventId().isBlank() || request.eventId().length() > 120
            || request.source() == null || request.source().isBlank() || request.source().length() > 80 || request.observedAt() == null) {
            throw new IllegalArgumentException("Invalid event ID, source or observation timestamp");
        }
        var existing = repository.findByEventId(request.eventId());
        if (existing.isPresent()) return duplicate(existing.get(), request);
        try {
            // saveAndFlush owns its transaction. A racing duplicate can roll back
            // there without poisoning an outer transaction after we return 202.
            repository.saveAndFlush(new CgmReading(request.eventId(), request.patientId(), request.observedAt(), request.glucoseMgDl(), request.source()));
            return new CgmIngestResponse("accepted", request.eventId());
        } catch (DataIntegrityViolationException duplicateRace) {
            var winner = repository.findByEventId(request.eventId());
            if (winner.isPresent()) return duplicate(winner.get(), request);
            throw duplicateRace; // A different storage failure must not be reported as a duplicate.
        }
    }

    private CgmIngestResponse duplicate(CgmReading saved, CgmEventRequest request) {
        if (!saved.getPatientId().equals(request.patientId()) || !saved.getObservedAt().equals(request.observedAt())
            || Double.compare(saved.getGlucoseMgDl(), request.glucoseMgDl()) != 0 || !saved.getSource().equals(request.source())) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT,
                "event_id_conflict: an existing event ID has different content; original reading preserved");
        }
        return new CgmIngestResponse("duplicate_ignored", request.eventId());
    }

    public List<CgmReading> readings(String patientId) {
        if (!demo.isKnownPatient(patientId)) throw new IllegalArgumentException("Unknown synthetic patient");
        return repository.findByPatientIdOrderByObservedAtAsc(patientId).stream()
            .sorted(java.util.Comparator.comparing(CgmReading::getObservedAt).thenComparing(CgmReading::getId)).toList();
    }
}
