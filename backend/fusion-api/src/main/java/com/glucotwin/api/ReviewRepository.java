package com.glucotwin.api;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReviewRepository extends JpaRepository<JournalReview, Long> {
    List<JournalReview> findByPredictionIdOrderByIdAsc(String predictionId);
}
