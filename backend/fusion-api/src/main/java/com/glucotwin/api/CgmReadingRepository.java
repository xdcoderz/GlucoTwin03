package com.glucotwin.api;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CgmReadingRepository extends JpaRepository<CgmReading, Long> {
    boolean existsByEventId(String eventId);
    java.util.Optional<CgmReading> findByEventId(String eventId);
    List<CgmReading> findByPatientIdOrderByObservedAtAsc(String patientId);
}
