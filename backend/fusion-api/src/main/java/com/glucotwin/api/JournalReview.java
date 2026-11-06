package com.glucotwin.api;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "journal_reviews")
public class JournalReview {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false) String predictionId;
    @Column(nullable = false) Instant recordedAt;
    @Column(nullable = false, length = 20) String action;
    @Column(nullable = false, length = 1000) String note;
    protected JournalReview() {}
}
