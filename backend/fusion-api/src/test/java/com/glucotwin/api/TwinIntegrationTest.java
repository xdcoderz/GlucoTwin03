package com.glucotwin.api;
import com.fasterxml.jackson.databind.*;
import java.time.*;
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

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:twin-tests;DB_CLOSE_DELAY=-1","spring.jpa.hibernate.ddl-auto=create-drop"})
@AutoConfigureMockMvc
class TwinIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired CgmService cgm;
    @Autowired CgmReadingRepository readings;
    @Autowired TwinRepository entries;
    @Autowired DemoPatientService demo;
    @MockitoBean TwinClient client;
    final String base="/api/patients/DEMO-001/twin";
    String body(){return "{\"origin\":\""+demo.baselineAt()+"\",\"scenario\":{\"carbsGrams\":30,\"slowFraction\":0.5,\"walkMinutes\":20}}";}
    @BeforeEach void setup(){
        entries.deleteAll();readings.deleteAll();reset(client);
        cgm.ingest(new CgmEventRequest("DEMO-001","twin-before",demo.baselineAt().minusSeconds(900),136.,"test"));
        cgm.ingest(new CgmEventRequest("DEMO-001","twin-origin",demo.baselineAt(),142.,"test"));
        cgm.ingest(new CgmEventRequest("DEMO-001","twin-future",demo.baselineAt().plusSeconds(900),400.,"test"));
        when(client.forecast(any())).thenAnswer(call->{
            JsonNode input=call.getArgument(0);
            var out=mapper.createObjectNode();out.put("status","available");out.put("patientId",input.path("patientId").asText());out.put("origin",input.path("origin").asText());out.put("modelVersion","TEST");
            var state=out.putArray("state");for(int i=0;i<6;i++)state.add(0);
            var curve=out.putArray("curve");for(int i=1;i<=24;i++)curve.addObject().put("minutes",i*5).put("baseline",140).put("scenario",150).put("lower",120).put("upper",160).put("scenarioLower",130).put("scenarioUpper",170);
            return out;
        });
    }
    @Test void prefixOnlyPersistenceAndPatientIsolation() throws Exception {
        var response=mvc.perform(post(base+"/forecasts").contentType("application/json").content(body())).andExpect(status().isOk()).andReturn().getResponse();
        var record=mapper.readTree(response.getContentAsString());
        assertEquals(2,record.path("input").path("readings").size());
        assertEquals(30,record.path("input").path("scenario").path("carbsGrams").asInt());
        mvc.perform(get(base+"/forecasts")).andExpect(jsonPath("$[0].forecastId").value(record.path("forecastId").asText()));
        mvc.perform(get(base.replace("DEMO-001","DEMO-002")+"/forecasts")).andExpect(jsonPath("$.length()").value(0));
        assertEquals(3,readings.count());assertEquals(1,entries.count());
    }
    @Test void contextIsIdempotentAndFutureContextExcluded() throws Exception {
        String context="{\"observedAt\":\""+demo.baselineAt().plusSeconds(900)+"\",\"carbsGrams\":40,\"slowFraction\":0.5}";
        for(int i=0;i<2;i++)mvc.perform(post(base+"/context").contentType("application/json").content(context)).andExpect(status().isOk());
        assertEquals(1,entries.count());
        mvc.perform(post(base+"/context").contentType("application/json").content(context.replace(":40",":50"))).andExpect(status().isConflict());
        mvc.perform(post(base+"/forecasts").contentType("application/json").content(body())).andExpect(jsonPath("$.input.context.length()").value(0));
    }
    @Test void rejectsUnknownInvalidAndUnreachable() throws Exception {
        mvc.perform(post(base.replace("DEMO-001","UNKNOWN")+"/forecasts").contentType("application/json").content(body())).andExpect(status().isBadRequest());
        mvc.perform(post(base+"/forecasts").contentType("application/json").content(body().replace("\"walkMinutes\":20","\"walkMinutes\":7"))).andExpect(status().isBadRequest());
        verify(client,never()).forecast(any());
        doThrow(new RuntimeException("offline")).when(client).forecast(any());
        mvc.perform(post(base+"/forecasts").contentType("application/json").content(body())).andExpect(jsonPath("$.status").value("unavailable"));
        assertEquals(0,entries.count());
    }
    @Test void rejectsMalformedModelOutputBeforeSave() throws Exception {
        doReturn(mapper.readTree("{\"status\":\"available\",\"patientId\":\"OTHER\"}")).when(client).forecast(any());
        mvc.perform(post(base+"/forecasts").contentType("application/json").content(body())).andExpect(jsonPath("$.status").value("unavailable"));
        assertEquals(0,entries.count());
    }
}
