package com.glucotwin.api;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;

@Entity
@Table(name = "cgm_readings", uniqueConstraints = @UniqueConstraint(name = "uk_cgm_event_id", columnNames = "event_id"))
public class CgmReading {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "event_id", nullable = false, length = 120)
    private String eventId;
    @Column(name = "patient_id", nullable = false, length = 80)
    private String patientId;
    @Column(name = "observed_at", nullable = false)
    private Instant observedAt;
    @Column(name = "glucose_mg_dl", nullable = false)
    private double glucoseMgDl;
    private Instant receivedAt;
    @Column(nullable = false, length = 80)
    private String source;

    protected CgmReading() {}

    public CgmReading(String eventId, String patientId, Instant observedAt, double glucoseMgDl, String source) {
        this.eventId = eventId;
        this.patientId = patientId;
        this.observedAt = observedAt;
        this.glucoseMgDl = glucoseMgDl;
        this.source = source;
        this.receivedAt = Instant.now();
    }

    public Long getId() { return id; }
    public String getEventId() { return eventId; }
    public String getPatientId() { return patientId; }
    public Instant getObservedAt() { return observedAt; }
    public double getGlucoseMgDl() { return glucoseMgDl; }
    public String getSource() { return source; }
    public Instant getReceivedAt() { return receivedAt; }
}
