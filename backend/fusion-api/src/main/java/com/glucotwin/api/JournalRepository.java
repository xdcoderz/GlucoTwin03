package com.glucotwin.api;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JournalRepository extends JpaRepository<JournalEntry, Long> {
    Optional<JournalEntry> findByPredictionId(String predictionId);
    Optional<JournalEntry> findFirstByPatientIdAndMealIdOrderBySequenceDesc(String patientId, String mealId);
    List<JournalEntry> findByPatientIdOrderBySequenceDesc(String patientId);
}
