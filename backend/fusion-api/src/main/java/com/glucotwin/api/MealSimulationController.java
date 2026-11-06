package com.glucotwin.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.*;
import org.springframework.web.bind.annotation.*;

/** What-if meals are stored separately from observed meals and prediction journals. */
@RestController
@RequestMapping("/api/patients/{patientId}/meal-simulations")
public class MealSimulationController {
    private static final List<String> CATEGORIES=List.of("rice","noodle","bread","vegetable","animal_protein","fruit","dairy","root_or_corn");
    private final DemoPatientService demo;
    private final JournalService journal;
    private final FeatureBuilder builder;
    private final PredictionService predictions;
    private final MealSimulationRepository entries;
    private final ObjectMapper mapper;
    public MealSimulationController(DemoPatientService demo,JournalService journal,FeatureBuilder builder,PredictionService predictions,MealSimulationRepository entries,ObjectMapper mapper) {
        this.demo=demo;this.journal=journal;this.builder=builder;this.predictions=predictions;this.entries=entries;this.mapper=mapper;
    }
    private void requireKnown(String patientId) {
        if(!demo.isKnownPatient(patientId))throw new IllegalArgumentException("Unknown synthetic patient");
    }
    @GetMapping
    public List<JsonNode> list(@PathVariable String patientId) {
        requireKnown(patientId);
        return entries.findTop20ByPatientIdOrderByIdDesc(patientId).stream().map(row->{
            try{return mapper.readTree(row.recordJson);}catch(Exception e){throw new IllegalStateException("Invalid saved meal simulation",e);}
        }).toList();
    }
    @PostMapping
    public JsonNode simulate(@PathVariable String patientId,@Valid @RequestBody MealSimulationRequest request) {
        requireKnown(patientId);
        if(new HashSet<>(request.categories()).size()!=request.categories().size())throw new IllegalArgumentException("Food categories must be unique");
        var history=journal.history(patientId); // Exact frozen baseline, never post-meal data.
        ObjectNode meal=demo.mealNode(patientId).deepCopy();
        meal.put("description",request.description().strip());
        meal.put("minutesSincePreviousMeal",request.minutesSincePreviousMeal());
        var categories=CATEGORIES.stream().filter(request.categories()::contains).toList();
        meal.set("selectedFoodCategories",mapper.valueToTree(categories));
        meal.put("portionGrams",request.portionGrams());
        Map<String,Double> features=new LinkedHashMap<>();
        var issues=journal.quality(history);
        PredictionResponse result;
        if(!issues.isEmpty())result=PredictionResponse.insufficient(String.join(",",issues));
        else {
            features.putAll(builder.build(demo.patientNode(patientId),meal,history));
            // Explicit food/weight fields override only the matching trained meal features.
            // One aggregate total is one reported-weight entry, not inferred item weights.
            features.put("reported_food_weight_g",request.portionGrams());
            features.put("food_items_with_reported_weight",1.0);
            for(String category:CATEGORIES)features.put("meal_contains_"+category,categories.contains(category)?1.0:0.0);
            result=predictions.scoreFeatures(features);
        }
        ObjectNode snapshot=journal.inputSnapshot(patientId,history).deepCopy();
        snapshot.set("currentMeal",meal);
        snapshot.put("baselineAt",demo.baselineAt().toString());
        snapshot.set("features",mapper.valueToTree(features));
        var record=mapper.createObjectNode();
        record.put("simulationId",UUID.randomUUID().toString());record.put("mode","meal_what_if");record.put("patientId",patientId);
        record.put("createdAt",Instant.now().toString());record.put("baselineAt",demo.baselineAt().toString());
        record.put("inputHash",journal.hash(snapshot));record.set("meal",meal);
        record.set("prediction",mapper.valueToTree(result));record.set("features",mapper.valueToTree(features));
        record.set("snapshot",snapshot);
        record.put("note","Hypothetical meal at a fixed synthetic baseline. Uncalibrated event score, not a glucose curve or a causal meal-response estimate.");
        var row=new MealSimulationEntry();row.patientId=patientId;
        try{row.recordJson=mapper.writeValueAsString(record);}catch(Exception e){throw new IllegalStateException("Cannot encode meal simulation",e);}
        entries.saveAndFlush(row);
        return record;
    }
}
