package com.glucotwin.api;

import jakarta.persistence.*;
import java.time.Instant;

/** Immutable inference attempt, including failures. Reviews are separate append-only rows. */
@Entity
@Table(name = "prediction_journal", indexes = @Index(name = "ix_journal_patient", columnList = "patientId"))
public class JournalEntry {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long sequence;
    @Column(nullable = false, unique = true) String predictionId;
    @Column(nullable = false) String patientId;
    @Column(nullable = false) String mealId;
    @Column(nullable = false) Instant baselineAt;
    @Column(nullable = false) Instant computedAt;
    @Column(nullable = false) String inputHash;
    @Column(nullable = false) boolean prospective;
    @Column(nullable = false) long observationCutoffId;
    @Lob @Column(nullable = false, updatable = false) String snapshotJson;
    @Lob @Column(nullable = false, updatable = false) String predictionJson;
    protected JournalEntry() {}
    public Long getSequence() { return sequence; }
}
