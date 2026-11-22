package com.glucotwin.api;

import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.*;
import java.util.*;
import org.springframework.web.bind.annotation.*;

/** Recorded context and immutable simulations stay separate from meal scores. */
@RestController
@RequestMapping("/api/patients/{patientId}/twin")
public class TwinController {
    public record Scenario(@NotNull @DecimalMin("0") @DecimalMax("200") Double carbsGrams,
        @NotNull @DecimalMin("0") @DecimalMax("1") Double slowFraction,
        @NotNull @Min(0) @Max(120) Integer walkMinutes) {}
    public record ForecastRequest(@NotNull Instant origin,@NotNull @Valid Scenario scenario) {}
    public record ContextRequest(@NotNull Instant observedAt,
        @DecimalMin("0") @DecimalMax("200") Double carbsGrams,
        @NotNull @DecimalMin("0") @DecimalMax("1") Double slowFraction,
        @DecimalMin("0") @DecimalMax("1500") Double stepsPer5Min,
        @DecimalMin("25") @DecimalMax("250") Double heartRateBpm,
        @DecimalMin("0") @DecimalMax("400") Double hrvMs,
        @DecimalMin("0") @DecimalMax("24") Double sleepHours) {}
    private final DemoPatientService demo;
    private final CgmService cgm;
    private final TwinClient client;
    private final TwinRepository entries;
    private final ObjectMapper mapper;
    public TwinController(DemoPatientService demo,CgmService cgm,TwinClient client,TwinRepository entries,ObjectMapper mapper) {
        this.demo=demo;this.cgm=cgm;this.client=client;this.entries=entries;this.mapper=mapper;
    }
    private void requireKnown(String id) {
        if(!demo.isKnownPatient(id))throw new IllegalArgumentException("Unknown synthetic patient");
    }
    private JsonNode decode(TwinEntry row) {
        try{return mapper.readTree(row.recordJson);}catch(Exception e){throw new IllegalStateException("Invalid saved twin record",e);}
    }
    private void save(String id,String kind,JsonNode record) {
        var row=new TwinEntry();row.patientId=id;row.kind=kind;row.recordJson=record.toString();entries.saveAndFlush(row);
    }
    @GetMapping("/forecasts")
    public List<JsonNode> list(@PathVariable String patientId) {
        requireKnown(patientId);
        return entries.findTop20ByPatientIdAndKindOrderByIdDesc(patientId,"forecast").stream().map(this::decode).toList();
    }
    @GetMapping("/context")
    public List<JsonNode> context(@PathVariable String patientId) {
        requireKnown(patientId);
        return entries.findByPatientIdAndKindOrderByIdAsc(patientId,"context").stream().map(this::decode).toList();
    }
    @PostMapping("/context")
    public synchronized JsonNode addContext(@PathVariable String patientId,@Valid @RequestBody ContextRequest request) {
        requireKnown(patientId);
        var values=Arrays.asList(request.carbsGrams(),request.stepsPer5Min(),request.heartRateBpm(),request.hrvMs(),request.sleepHours());
        if(values.stream().allMatch(Objects::isNull)||values.stream().anyMatch(v->v!=null&&!Double.isFinite(v))||!Double.isFinite(request.slowFraction()))
            throw new IllegalArgumentException("Provide at least one finite context value");
        if(request.observedAt().getEpochSecond()%300!=0||request.observedAt().getNano()!=0)
            throw new IllegalArgumentException("Use a five-minute UTC timestamp");
        var old=context(patientId);
        if(old.size()>=1000)throw new IllegalArgumentException("Context limit reached for this demo patient");
        var node=mapper.valueToTree(request);
        for(var row:old)if(Instant.parse(row.path("observedAt").asText()).equals(request.observedAt())) {
            if(row.equals(node))return row;
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT,"Context already recorded at this time");
        }
        save(patientId,"context",node);return node;
    }
    @PostMapping("/forecasts")
    public JsonNode forecast(@PathVariable String patientId,@Valid @RequestBody ForecastRequest request) {
        requireKnown(patientId);
        if(request.scenario().walkMinutes()%5!=0||!Double.isFinite(request.scenario().carbsGrams())||!Double.isFinite(request.scenario().slowFraction()))
            throw new IllegalArgumentException("Use finite scenario values and five-minute walking intervals");
        var origin=request.origin();
        var history=cgm.readings(patientId).stream().filter(r->!r.getObservedAt().isAfter(origin)&&!r.getObservedAt().isBefore(origin.minus(Duration.ofDays(14)))).toList();
        var input=mapper.createObjectNode();input.put("patientId",patientId);input.put("origin",origin.toString());
        input.put("referenceGlucose",demo.patientNode(patientId).path("fastingPlasmaGlucoseMgDl").asDouble());
        input.put("hba1c",demo.patientNode(patientId).path("hba1cPercent").asDouble(7));
        var readings=input.putArray("readings");var seen=new HashSet<Instant>();
        for(var r:history) {
            if(!seen.add(r.getObservedAt()))return unavailable("Conflicting reading timestamps; resolve before forecasting.");
            if(Duration.between(r.getObservedAt(),origin).toSeconds()%300!=0)return unavailable("Readings must align to a five-minute grid.");
            readings.addObject().put("observedAt",r.getObservedAt().toString()).put("glucoseMgDl",r.getGlucoseMgDl());
        }
        var context=input.putArray("context");
        for(var row:context(patientId)) {
            var t=Instant.parse(row.path("observedAt").asText());
            if(!t.isAfter(origin)&&!t.isBefore(origin.minus(Duration.ofDays(14))))context.add(row);
        }
        input.set("scenario",mapper.valueToTree(request.scenario()));
        JsonNode result;
        try {
            result=client.forecast(input);
            if(result==null||!List.of("available","insufficient_data").contains(result.path("status").asText()))return unavailable("Twin service returned an invalid result.");
            if(result.path("status").asText().equals("available")&&!valid(result,patientId,origin))return unavailable("Twin service returned an invalid forecast.");
        }catch(Exception e){return unavailable("Twin service unavailable. No browser forecast substituted.");}
        var record=mapper.createObjectNode();record.put("forecastId",UUID.randomUUID().toString());record.put("patientId",patientId);
        record.put("createdAt",Instant.now().toString());record.set("input",input);record.set("result",result);
        save(patientId,"forecast",record);return record;
    }
    private boolean valid(JsonNode r,String id,Instant origin) {
        if(!id.equals(r.path("patientId").asText())||!origin.equals(Instant.parse(r.path("origin").asText()))||r.path("curve").size()!=24||r.path("state").size()!=6||r.path("modelVersion").asText().isBlank())return false;
        int i=1;
        for(var point:r.path("curve")) {
            if(point.path("minutes").asInt()!=i++*5)return false;
            for(String key:List.of("baseline","scenario","lower","upper","scenarioLower","scenarioUpper"))if(!point.path(key).isNumber()||!Double.isFinite(point.path(key).asDouble()))return false;
            if(point.path("lower").asDouble()>point.path("upper").asDouble()||point.path("scenarioLower").asDouble()>point.path("scenarioUpper").asDouble())return false;
        }
        return true;
    }
    private JsonNode unavailable(String reason) {
        return mapper.createObjectNode().put("status","unavailable").put("reason",reason);
    }
}
