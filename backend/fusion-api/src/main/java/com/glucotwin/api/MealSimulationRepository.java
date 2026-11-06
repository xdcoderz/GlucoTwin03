package com.glucotwin.api;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MealSimulationRepository extends JpaRepository<MealSimulationEntry,Long> {
    List<MealSimulationEntry> findTop20ByPatientIdOrderByIdDesc(String patientId);
}
