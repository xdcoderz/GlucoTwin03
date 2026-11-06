package com.glucotwin.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {"spring.datasource.url=jdbc:h2:mem:journal-tests;DB_CLOSE_DELAY=-1", "spring.jpa.hibernate.ddl-auto=create-drop"})
@AutoConfigureMockMvc
class JournalIntegrationTest {
    @Autowired JournalService journal;
    @Autowired PredictionService predictions;
    @Autowired DemoPatientService demo;
    @Autowired CgmService cgm;
    @Autowired JournalController controller;
    @Autowired JournalRepository entries;
    @Autowired ReviewRepository reviews;
    @Autowired CgmReadingRepository readings;
    @Autowired ObjectMapper mapper;
    @Autowired MockMvc mvc;
    @MockitoBean PredictionClient client;

    @BeforeEach void clear() {
        reviews.deleteAll(); entries.deleteAll(); readings.deleteAll(); reset(client);
        when(client.predict(anyMap())).thenReturn(new PredictionResponse("available", .2, 120, .5, false, "TEST-MODEL-NOT-CLINICAL", List.of(), null));
        when(client.health()).thenReturn(new PredictionClient.ModelStatus("ready", "TEST-MODEL-NOT-CLINICAL", java.time.Instant.now()));
    }
    void seed(String patientId, int skip) throws Exception {
        String file = patientId.equals("DEMO-001") ? "/demo_patient_001.json" : "/demo_patient_002.json";
        try (var stream = getClass().getResourceAsStream(file)) {
            for (var row : mapper.readTree(stream).path("cgmHistory")) {
                int minute = row.path("minutesBefore").asInt();
                if (minute != skip) cgm.ingest(new CgmEventRequest(patientId, patientId + "-HISTORY-" + minute, demo.baselineAt().minus(Duration.ofMinutes(minute)), row.path("glucoseMgDl").asDouble(), "synthetic-test-fixture"));
            }
        }
    }
    void replay(String pid, String stage) { controller.replay(pid, new JournalController.ReplayRequest(stage)); }

    @Test void fixedBaselineNoLeakageImmutableVersionsAndIdempotentReplay() throws Exception {
        seed("DEMO-001", -1); predictions.refresh("DEMO-001");
        var first = journal.latest("DEMO-001");
        assertTrue(first.prospective()); assertEquals(64, first.inputHash().length());
        assertEquals(9, first.snapshot().path("cgmHistory").size());
        replay("DEMO-001", "partial");
        var partial = journal.get(first.predictionId()).outcome();
        assertEquals("partial_follow_up", partial.status()); assertNull(partial.eventObserved()); assertNull(partial.predictionMatched());
        replay("DEMO-001", "complete");
        var complete = journal.get(first.predictionId());
        assertEquals(8, complete.outcome().receivedSamples()); assertEquals(false, complete.outcome().eventObserved()); assertEquals(true, complete.outcome().predictionMatched());
        assertEquals(142., complete.baselineGlucoseMgDl());
        assertEquals(161., complete.outcome().observedMaxMgDl());
        assertEquals(9, journal.history("DEMO-001").size());
        assertEquals(0, controller.replay("DEMO-001", new JournalController.ReplayRequest("complete")).get("accepted"));
        predictions.refresh("DEMO-001");
        var second = journal.latest("DEMO-001");
        assertNotEquals(first.predictionId(), second.predictionId()); assertEquals(first.inputHash(), second.inputHash());
        assertFalse(second.prospective()); assertNull(second.outcome().predictionMatched());
        assertTrue(journal.get(first.predictionId()).superseded());
        assertEquals(first.snapshot(), journal.get(first.predictionId()).snapshot());
        assertEquals(first.computedAt(), journal.get(first.predictionId()).computedAt());
        verify(client, times(2)).predict(argThat(features -> features.get("baseline_glucose_mg_dl") == 142. && features.get("glucose_observations_prev_120_min") == 9.));
    }
    @Test void gapAtHorizonCannotClaimNegativeAndCompletionFillsGap() throws Exception {
        seed("DEMO-001", -1); predictions.refresh("DEMO-001"); replay("DEMO-001", "gap");
        var outcome = journal.latest("DEMO-001").outcome();
        assertEquals(7, outcome.receivedSamples()); assertEquals("insufficient_follow_up", outcome.status());
        assertNull(outcome.eventObserved()); assertNull(outcome.reaches180()); assertNull(outcome.predictionMatched());
        replay("DEMO-001", "complete"); assertEquals(false, journal.latest("DEMO-001").outcome().eventObserved());
    }
    @Test void positiveSampleCanEstablishEventBeforeWindowCompleteAndPatientsStaySeparate() throws Exception {
        seed("DEMO-001", -1); seed("DEMO-002", -1); predictions.refresh("DEMO-002"); replay("DEMO-002", "partial");
        var high = journal.latest("DEMO-002"); assertTrue(high.baselineAlreadyHigh());
        assertEquals("event_observed", high.outcome().status()); assertEquals(true, high.outcome().eventObserved());
        assertFalse(high.outcome().complete()); assertEquals(false, high.outcome().predictionMatched());
        assertEquals(0, journal.latest("DEMO-001").outcome().receivedSamples());
        assertNull(journal.latest("DEMO-001").predictionId()); assertEquals(2, journal.worklist().size());
    }
    @Test void missingIntermediateHistoryBlocksInferenceWithSpecificReason() throws Exception {
        seed("DEMO-001", 45);
        var result = predictions.refresh("DEMO-001");
        assertEquals("insufficient_data", result.status()); assertTrue(result.reason().contains("missing_history_offset_45"));
        assertNull(result.modelScore()); verifyNoInteractions(client);
    }
    @Test void conflictingBaselineChangesCurrentInputsWithoutRewritingSavedRecord() throws Exception {
        seed("DEMO-001", -1); predictions.refresh("DEMO-001"); var first = journal.latest("DEMO-001");
        cgm.ingest(new CgmEventRequest("DEMO-001", "conflict-baseline", demo.baselineAt(), 150., "synthetic-test-fixture"));
        var historical = journal.get(first.predictionId());
        assertTrue(historical.inputChanged()); assertEquals(142., historical.baselineGlucoseMgDl()); assertEquals(first.snapshot(), historical.snapshot());
        assertEquals("insufficient_data", predictions.refresh("DEMO-001").status());
        assertNull(journal.latest("DEMO-001").baselineGlucoseMgDl());
    }
    @Test void followupConflictAndOutsideWindowDoNotCreateFalseNegativeOrShiftBaseline() throws Exception {
        seed("DEMO-001", -1); predictions.refresh("DEMO-001"); replay("DEMO-001", "complete");
        cgm.ingest(new CgmEventRequest("DEMO-001", "conflicting-outcome", demo.baselineAt().plus(Duration.ofMinutes(120)), 147., "synthetic-test-fixture"));
        cgm.ingest(new CgmEventRequest("DEMO-001", "outside-window", demo.baselineAt().plus(Duration.ofMinutes(121)), 500., "synthetic-test-fixture"));
        var row = journal.latest("DEMO-001"); assertEquals(1, row.outcome().conflictingTimestamps());
        assertNull(row.outcome().eventObserved()); assertEquals(161., row.outcome().observedMaxMgDl()); assertEquals(142., row.baselineGlucoseMgDl());
        mvc.perform(get("/api/patients/DEMO-001")).andExpect(status().isOk()).andExpect(jsonPath("$.cgmHistory.length()").value(9));
    }
    @Test void unavailableAndInvalidModelResponsesAreSavedWithoutInventedScore() throws Exception {
        seed("DEMO-001", -1); when(client.predict(anyMap())).thenThrow(new RuntimeException("synthetic outage"));
        assertEquals("unavailable", predictions.refresh("DEMO-001").status());
        assertNull(journal.latest("DEMO-001").prediction().modelScore());
        doReturn(new PredictionResponse("available", .9, 120, .5, false, "bad", List.of(), null)).when(client).predict(anyMap());
        assertEquals("invalid_model_response", predictions.refresh("DEMO-001").reason());
        assertEquals(2, journal.historyEntries("DEMO-001").size());
    }
    @Test void futureArrivingDuringInferenceCannotCountAsProspective() throws Exception {
        seed("DEMO-001", -1);
        when(client.predict(anyMap())).thenAnswer(call -> {
            cgm.ingest(new CgmEventRequest("DEMO-001", "during-model", demo.baselineAt().plus(Duration.ofMinutes(15)), 190., "synthetic-test-fixture"));
            return new PredictionResponse("available", .8, 120, .5, true, "test", List.of(), null);
        });
        predictions.refresh("DEMO-001"); var row = journal.latest("DEMO-001");
        assertFalse(row.prospective()); assertEquals(true, row.outcome().eventObserved()); assertNull(row.outcome().predictionMatched());
    }
    @Test void reviewNotesAppendReopenAndSurviveServiceReconstruction() throws Exception {
        seed("DEMO-001", -1); predictions.refresh("DEMO-001"); var first = journal.latest("DEMO-001");
        mvc.perform(post("/api/journal/"+first.predictionId()+"/reviews").contentType("application/json").content("{\"action\":\"reviewed\",\"note\":\"TEST: reviewed synthetic meal\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.reviewState").value("reviewed"));
        journal.review(first.predictionId(), "reopened", "TEST: follow-up needs review");
        var fresh = new JournalService(entries, reviews, demo, cgm, mapper);
        assertEquals(first.snapshot(), fresh.get(first.predictionId()).snapshot());
        assertEquals(2, fresh.get(first.predictionId()).reviews().size());
        assertEquals("awaiting_review", fresh.get(first.predictionId()).reviewState());
        assertEquals(.2, new PredictionService(demo, new FeatureBuilder(), client, fresh).latest("DEMO-001").modelScore());
        mvc.perform(post("/api/journal/"+first.predictionId()+"/reviews").contentType("application/json").content("{\"action\":\"reviewed\",\"note\":\" \"}"))
            .andExpect(status().isBadRequest());
    }
    @Test void followupRequiresSavedAttemptAndWorklistReadsCreateNothing() throws Exception {
        seed("DEMO-001", -1);
        mvc.perform(get("/api/worklist")).andExpect(status().isOk()).andExpect(jsonPath("$[0].predictionId").isEmpty());
        assertEquals(0, entries.count());
        mvc.perform(post("/api/demo/patients/DEMO-001/follow-up").contentType("application/json").content("{\"stage\":\"complete\"}"))
            .andExpect(status().isConflict());
    }
    @Test void browserPreviewOriginIsAllowedAndUnlistedOriginsAreRejected() throws Exception {
        mvc.perform(options("/api/worklist").header("Origin", "http://127.0.0.1:5175").header("Access-Control-Request-Method", "GET"))
            .andExpect(status().isOk()).andExpect(header().string("Access-Control-Allow-Origin", "http://127.0.0.1:5175"));
        mvc.perform(options("/api/worklist").header("Origin", "https://unlisted.example").header("Access-Control-Request-Method", "GET"))
            .andExpect(status().isForbidden());
    }
    @Test void equivalentDuplicateTimestampsDoNotChangeFeaturesOrInputFingerprint() throws Exception {
        seed("DEMO-001", -1); predictions.refresh("DEMO-001"); var first = journal.latest("DEMO-001");
        cgm.ingest(new CgmEventRequest("DEMO-001", "same-value-new-id", demo.baselineAt(), 142., "synthetic-test-fixture"));
        assertFalse(journal.get(first.predictionId()).inputChanged());
        predictions.refresh("DEMO-001"); var second = journal.latest("DEMO-001");
        assertEquals(first.inputHash(), second.inputHash()); assertEquals(9, second.snapshot().path("cgmHistory").size());
    }
    @Test void concurrentDuplicateDeliveryCommitsOneReadingWithoutRollbackError() throws Exception {
        var event = new CgmEventRequest("DEMO-001", "racing-duplicate", demo.baselineAt(), 142., "synthetic-test-fixture");
        try (var pool = java.util.concurrent.Executors.newFixedThreadPool(2)) {
            var start = new java.util.concurrent.CountDownLatch(1);
            var first = pool.submit(() -> { start.await(); return cgm.ingest(event).status(); });
            var second = pool.submit(() -> { start.await(); return cgm.ingest(event).status(); });
            start.countDown();
            var statuses = List.of(first.get(5, java.util.concurrent.TimeUnit.SECONDS), second.get(5, java.util.concurrent.TimeUnit.SECONDS));
            assertTrue(statuses.contains("accepted")); assertTrue(statuses.contains("duplicate_ignored"));
            assertEquals(1, readings.count());
        }
    }

    @Test void duplicateIdWithDifferentPayloadIsConflictAndOriginalIsPreserved() throws Exception {
        var event = new CgmEventRequest("DEMO-001", "TEST-REUSED-ID", demo.baselineAt(), 142., "synthetic-test-fixture");
        cgm.ingest(event);
        assertEquals("duplicate_ignored", cgm.ingest(event).status());
        for (var conflict : List.of(
            new CgmEventRequest("DEMO-001", event.eventId(), demo.baselineAt(), 180., event.source()),
            new CgmEventRequest("DEMO-002", event.eventId(), demo.baselineAt(), 142., event.source()),
            new CgmEventRequest("DEMO-001", event.eventId(), demo.baselineAt().minusSeconds(1), 142., event.source()),
            new CgmEventRequest("DEMO-001", event.eventId(), demo.baselineAt(), 142., "different-source"))) {
            mvc.perform(post("/api/cgm/events").contentType("application/json").content(mapper.writeValueAsString(conflict)))
                .andExpect(status().isConflict());
        }
        assertEquals(1, readings.count()); assertEquals(142., readings.findByEventId(event.eventId()).orElseThrow().getGlucoseMgDl());
    }

    @Test void invalidIngestionCannotReachStorageThroughHttpOrInternalReplay() throws Exception {
        for (double value : new double[] { Double.NaN, Double.POSITIVE_INFINITY, 39., 501. }) {
            assertThrows(IllegalArgumentException.class, () -> cgm.ingest(new CgmEventRequest("DEMO-001", "TEST-invalid", demo.baselineAt(), value, "test")));
        }
        mvc.perform(post("/api/cgm/events").contentType("application/json").content(mapper.writeValueAsString(new CgmEventRequest("DEMO-001", "x".repeat(121), demo.baselineAt(), 142., "test"))))
            .andExpect(status().isBadRequest());
        assertEquals(0, readings.count());
    }

    @Test void readinessIsReadOnlyAndTracksHistoryModelResultAndReview() throws Exception {
        seed("DEMO-001", 45);
        mvc.perform(get("/api/patients/DEMO-001/readiness")).andExpect(status().isOk())
            .andExpect(jsonPath("$.historyReady").value(false)).andExpect(jsonPath("$.receivedExpectedSamples").value(8))
            .andExpect(jsonPath("$.historySlots.length()").value(9)).andExpect(jsonPath("$.nextAction").value("history"));
        seed("DEMO-001", -1);
        mvc.perform(get("/api/patients/DEMO-001/readiness")).andExpect(jsonPath("$.historyReady").value(true))
            .andExpect(jsonPath("$.model.status").value("ready")).andExpect(jsonPath("$.nextAction").value("score"));
        assertEquals(0, entries.count()); verify(client, never()).predict(anyMap());
        predictions.refresh("DEMO-001");
        mvc.perform(get("/api/patients/DEMO-001/readiness")).andExpect(jsonPath("$.nextAction").value("follow_up"));
        replay("DEMO-001", "complete");
        mvc.perform(get("/api/patients/DEMO-001/readiness")).andExpect(jsonPath("$.nextAction").value("review"));
        journal.review(journal.latest("DEMO-001").predictionId(), "reviewed", "TEST ONLY: readiness flow");
        when(client.health()).thenReturn(new PredictionClient.ModelStatus("unavailable", null, java.time.Instant.now()));
        mvc.perform(get("/api/patients/DEMO-001/readiness")).andExpect(jsonPath("$.nextAction").value("complete"))
            .andExpect(jsonPath("$.model.status").value("unavailable")).andExpect(jsonPath("$.latestReceivedAt").isNotEmpty());
        mvc.perform(get("/api/patients/unknown/readiness")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/patients/DEMO-001/cgm")).andExpect(jsonPath("$[0].receivedAt").isNotEmpty());
    }

    @Test void invalidThresholdVersionAndFactorsCannotBecomeAvailableScores() throws Exception {
        seed("DEMO-001", -1);
        for (var response : List.of(
            new PredictionResponse("available", .8, 120, .7, true, "test", List.of(), null),
            new PredictionResponse("available", .8, 120, .5, true, "", List.of(), null),
            new PredictionResponse("available", .8, 120, .5, true, "test", List.of(new PredictionFactor("bmi", Double.NaN, "up")), null),
            new PredictionResponse("available", .8, 120, .5, true, "test", List.of(new PredictionFactor("bmi", -.2, "up")), null))) {
            when(client.predict(anyMap())).thenReturn(response);
            assertEquals("invalid_model_response", predictions.refresh("DEMO-001").reason());
            assertNull(journal.latest("DEMO-001").prediction().modelScore());
        }
    }
}
