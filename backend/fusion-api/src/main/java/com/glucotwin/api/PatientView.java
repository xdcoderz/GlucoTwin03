package com.glucotwin.api;

import java.util.List;
import java.util.Map;

public record PatientView(
    Map<String, Object> patient,
    Map<String, Object> currentMeal,
    List<CgmReadingView> cgmHistory,
    PredictionResponse prediction,
    JournalView journal
) {}
