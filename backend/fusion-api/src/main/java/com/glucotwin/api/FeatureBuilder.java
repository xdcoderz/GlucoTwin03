package com.glucotwin.api;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

@Component
public class FeatureBuilder {
    private static final Pattern WEIGHT = Pattern.compile("(?<![a-z])([0-9]+(?:\\.[0-9]+)?)\\s*g\\b");
    private static final Map<String, List<String>> KEYWORDS = Map.of(
        "rice", List.of("rice"),
        "noodle", List.of("noodle", "vermicelli"),
        "bread", List.of("bread", "bun", "toast"),
        "fruit", List.of("apple", "banana", "grape", "orange", "peach", "pear", "pomelo", "watermelon"),
        "vegetable", List.of("vegetable", "spinach", "cabbage", "lettuce", "cucumber", "tomato", "broccoli", "cauliflower"),
        "animal_protein", List.of("beef", "chicken", "duck", "egg", "fish", "lamb", "mutton", "pork", "shrimp"),
        "dairy", List.of("milk", "yogurt", "yoghurt"),
        "root_or_corn", List.of("potato", "sweet potato", "yam", "corn", "lotus root")
    );

    public Map<String, Double> build(JsonNode patient, JsonNode meal, List<CgmReading> allReadings) {
        if (allReadings.size() < 9) throw new IllegalStateException("At least nine CGM readings are required");
        List<CgmReading> readings = allReadings.stream().sorted(Comparator.comparing(CgmReading::getObservedAt)).toList();
        CgmReading baseline = readings.get(readings.size() - 1);
        Instant t0 = baseline.getObservedAt();
        Map<Long, Double> lags = new LinkedHashMap<>();
        for (long minutes : List.of(15L, 30L, 60L, 120L)) {
            Instant target = t0.minus(Duration.ofMinutes(minutes));
            Double value = readings.stream().filter(r -> r.getObservedAt().equals(target)).map(CgmReading::getGlucoseMgDl).findFirst().orElse(null);
            if (value == null) throw new IllegalStateException("Missing exact CGM lag at " + minutes + " minutes");
            lags.put(minutes, value);
        }
        List<Double> history = readings.stream()
            .filter(r -> !r.getObservedAt().isAfter(t0) && !r.getObservedAt().isBefore(t0.minus(Duration.ofMinutes(120))))
            .map(CgmReading::getGlucoseMgDl).toList();
        if (history.size() < 2) throw new IllegalStateException("Insufficient CGM history");

        double base = baseline.getGlucoseMgDl();
        double mean = history.stream().mapToDouble(Double::doubleValue).average().orElseThrow();
        double sumSquares = history.stream().mapToDouble(v -> (v - mean) * (v - mean)).sum();
        double std = Math.sqrt(sumSquares / (history.size() - 1));
        double min = history.stream().mapToDouble(Double::doubleValue).min().orElseThrow();
        double max = history.stream().mapToDouble(Double::doubleValue).max().orElseThrow();
        Map<String, Double> f = new LinkedHashMap<>();
        f.put("baseline_glucose_mg_dl", base);
        for (long m : List.of(15L, 30L, 60L, 120L)) f.put("glucose_lag_" + m + "_min_mg_dl", lags.get(m));
        for (long m : List.of(15L, 30L, 60L, 120L)) f.put("glucose_change_prev_" + m + "_min_mg_dl", base - lags.get(m));
        f.put("glucose_mean_prev_120_min_mg_dl", mean);
        f.put("glucose_std_prev_120_min_mg_dl", std);
        f.put("glucose_min_prev_120_min_mg_dl", min);
        f.put("glucose_max_prev_120_min_mg_dl", max);
        f.put("glucose_range_prev_120_min_mg_dl", max - min);
        f.put("glucose_observations_prev_120_min", (double) history.size());

        var dateTime = t0.atZone(ZoneOffset.UTC);
        double hour = dateTime.getHour() + dateTime.getMinute() / 60.0;
        double angle = 2.0 * Math.PI * hour / 24.0;
        f.put("meal_hour_sin", Math.sin(angle));
        f.put("meal_hour_cos", Math.cos(angle));
        f.put("meal_is_weekend", dateTime.getDayOfWeek().getValue() >= 6 ? 1.0 : 0.0);
        f.put("minutes_since_previous_meal", number(meal, "minutesSincePreviousMeal"));

        String mealText = meal.path("description").asText("");
        Matcher matcher = WEIGHT.matcher(mealText.toLowerCase(Locale.ROOT));
        double totalWeight = 0.0;
        int weightCount = 0;
        while (matcher.find()) { totalWeight += Double.parseDouble(matcher.group(1)); weightCount++; }
        f.put("reported_food_weight_g", weightCount == 0 ? null : totalWeight);
        f.put("food_items_with_reported_weight", (double) weightCount);
        f.put("meal_text_length_characters", (double) mealText.length());
        String lower = mealText.toLowerCase(Locale.ROOT);
        for (var group : KEYWORDS.entrySet()) {
            boolean present = group.getValue().stream().anyMatch(word -> Pattern.compile("\\b" + Pattern.quote(word) + "\\b").matcher(lower).find());
            f.put("meal_contains_" + group.getKey(), present ? 1.0 : 0.0);
        }

        f.put("csii_bolus_insulin_iu_at_meal", number(meal, "csiiBolusInsulinIu"));
        f.put("csii_basal_insulin_iu_per_hour_at_meal", number(meal, "csiiBasalInsulinIuPerHour"));
        f.put("has_recorded_csii_bolus_at_meal", bool(meal, "hasRecordedCsiiBolus"));
        f.put("has_recorded_csii_basal_setting_at_meal", bool(meal, "hasRecordedCsiiBasalSetting"));
        f.put("has_recorded_subcutaneous_insulin_at_meal", bool(meal, "hasRecordedSubcutaneousInsulin"));
        f.put("has_recorded_non_insulin_medication_at_meal", bool(meal, "hasRecordedNonInsulinMedication"));
        f.put("has_recorded_intravenous_insulin_at_meal", bool(meal, "hasRecordedIntravenousInsulin"));

        f.put("sex_female", patient.path("sex").asText("").equalsIgnoreCase("female") ? 1.0 : 0.0);
        f.put("age_years", number(patient, "ageYears"));
        f.put("bmi_kg_m2", number(patient, "bmiKgM2"));
        f.put("diabetes_duration_years", number(patient, "diabetesDurationYears"));
        f.put("hba1c_percent", number(patient, "hba1cPercent"));
        f.put("fasting_plasma_glucose_mg_dl", number(patient, "fastingPlasmaGlucoseMgDl"));
        if (f.size() != 43) throw new IllegalStateException("Feature vector is not the expected 43 inputs");
        return f;
    }

    private static Double number(JsonNode node, String field) {
        JsonNode value = node.path(field);
        return value.isNumber() ? value.doubleValue() : null;
    }
    private static Double bool(JsonNode node, String field) {
        return node.path(field).asBoolean(false) ? 1.0 : 0.0;
    }
}
