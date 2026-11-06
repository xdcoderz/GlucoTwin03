package com.glucotwin.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:meal-tests;DB_CLOSE_DELAY=-1","spring.jpa.hibernate.ddl-auto=create-drop"})
@AutoConfigureMockMvc
class MealSimulationIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired DemoPatientService demo;
    @Autowired CgmService cgm;
    @Autowired CgmReadingRepository readings;
    @Autowired MealSimulationRepository meals;
    @Autowired JournalRepository entries;
    @Autowired JournalService journal;
    @Autowired PredictionService predictions;
    @MockitoBean PredictionClient client;
    final String url="/api/patients/DEMO-001/meal-simulations";
    @BeforeEach void setup() throws Exception {
        meals.deleteAll();entries.deleteAll();readings.deleteAll();reset(client);
        when(client.predict(anyMap())).thenAnswer(call->{
            Map<String,Double> features=call.getArgument(0);
            double score=features.get("reported_food_weight_g")/1000.;
            return new PredictionResponse("available",score,120,.5,score>=.5,"TEST-MEAL-MODEL",List.of(new PredictionFactor("reported_food_weight_g",.1,"up")),null);
        });
        try(var stream=getClass().getResourceAsStream("/demo_patient_001.json")) {
            for(var row:mapper.readTree(stream).path("cgmHistory")) {
                int lag=row.path("minutesBefore").asInt();
                cgm.ingest(new CgmEventRequest("DEMO-001","meal-test-"+lag,demo.baselineAt().minus(Duration.ofMinutes(lag)),row.path("glucoseMgDl").asDouble(),"synthetic-test"));
            }
        }
    }
    String body(int grams) {return "{\"description\":\"2 rotis 100 g, dal and curd 80 g\",\"categories\":[\"bread\",\"dairy\"],\"portionGrams\":"+grams+",\"minutesSincePreviousMeal\":240}";}
    @Test void customFeaturesAreUsedAndImmutableLogsNeverReplaceRecordedMeal() throws Exception {
        predictions.refresh("DEMO-001");
        var original=mapper.valueToTree(journal.latest("DEMO-001"));var fixture=demo.mealNode("DEMO-001").deepCopy();
        var first=mapper.readTree(mvc.perform(post(url).contentType("application/json").content(body(200))).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        var second=mapper.readTree(mvc.perform(post(url).contentType("application/json").content(body(600))).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertEquals(.2,first.path("prediction").path("model_score").asDouble());assertEquals(.6,second.path("prediction").path("model_score").asDouble());
        var features=first.path("features");assertEquals(43,features.size());assertEquals(200,features.path("reported_food_weight_g").asInt());
        assertEquals(1,features.path("food_items_with_reported_weight").asInt()); // Total replaces text's 180 g; never added twice.
        assertEquals(1,features.path("meal_contains_bread").asInt());assertEquals(1,features.path("meal_contains_dairy").asInt());assertEquals(0,features.path("meal_contains_rice").asInt());
        assertEquals(240,features.path("minutes_since_previous_meal").asInt());
        assertEquals(fixture.path("hasRecordedNonInsulinMedication"),first.path("snapshot").path("currentMeal").path("hasRecordedNonInsulinMedication"));
        assertNotEquals(first.path("inputHash"),second.path("inputHash"));
        assertEquals(original,mapper.valueToTree(journal.latest("DEMO-001")));assertEquals(fixture,demo.mealNode("DEMO-001"));assertEquals(1,entries.count());
        mvc.perform(get(url)).andExpect(jsonPath("$.length()").value(2)).andExpect(jsonPath("$[1].inputHash").value(first.path("inputHash").asText()));
        mvc.perform(get("/api/patients/DEMO-002/meal-simulations")).andExpect(jsonPath("$.length()").value(0));
    }
    @Test void rejectsInvalidInputsBeforeInferenceOrPersistence() throws Exception {
        for(String bad:List.of(body(0),body(2001),body(200).replace("240","1441"),body(200).replace("bread","insulin"),body(200).replace("2 rotis 100 g, dal and curd 80 g","  "),body(200).replace("[\"bread\",\"dairy\"]","[\"bread\",\"bread\"]"),body(200).replace("[\"bread\",\"dairy\"]","null")))
            mvc.perform(post(url).contentType("application/json").content(bad)).andExpect(status().isBadRequest());
        mvc.perform(post(url.replace("DEMO-001","UNKNOWN")).contentType("application/json").content(body(200))).andExpect(status().isBadRequest());
        assertEquals(0,meals.count());verify(client,never()).predict(anyMap());
    }
    @Test void missingHistoryCannotProduceInventedScore() throws Exception {
        readings.deleteAll();
        mvc.perform(post(url).contentType("application/json").content(body(200))).andExpect(status().isOk()).andExpect(jsonPath("$.prediction.status").value("insufficient_data")).andExpect(jsonPath("$.prediction.model_score").isEmpty());
        verify(client,never()).predict(anyMap());assertEquals(0,entries.count());
    }
    @Test void unavailableAndInvalidModelResponsesNeverBecomeScores() throws Exception {
        doThrow(new RuntimeException("offline")).when(client).predict(anyMap());
        mvc.perform(post(url).contentType("application/json").content(body(200))).andExpect(jsonPath("$.prediction.status").value("unavailable")).andExpect(jsonPath("$.prediction.model_score").isEmpty());
        doReturn(new PredictionResponse("available",.7,120,.8,false,"invalid",List.of(),null)).when(client).predict(anyMap());
        mvc.perform(post(url).contentType("application/json").content(body(200))).andExpect(jsonPath("$.prediction.reason").value("invalid_model_response"));
    }
    @Test void postMealReadingsNeverLeakIntoCustomModelInputs() throws Exception {
        cgm.ingest(new CgmEventRequest("DEMO-001","after-baseline",demo.baselineAt().plusSeconds(900),400.,"synthetic-test"));
        mvc.perform(post(url).contentType("application/json").content(body(200))).andExpect(jsonPath("$.features.baseline_glucose_mg_dl").value(142.)).andExpect(jsonPath("$.features.glucose_observations_prev_120_min").value(9.));
    }
}
