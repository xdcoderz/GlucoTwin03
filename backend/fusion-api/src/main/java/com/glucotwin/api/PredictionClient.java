package com.glucotwin.api;

import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

@Component
public class PredictionClient {
    private final RestClient client;
    private final RestClient healthClient;
    private ModelStatus cachedHealth;
    public record ModelStatus(String status, String modelVersion, java.time.Instant checkedAt) {}
    private record HealthBody(@com.fasterxml.jackson.annotation.JsonProperty("model_loaded") boolean loaded,
        @com.fasterxml.jackson.annotation.JsonProperty("model_version") String version) {}
    public PredictionClient(RestClient.Builder builder, @Value("${ml.service.base-url:http://ml-service:8000}") String baseUrl) {
        // Uvicorn serves this internal endpoint over HTTP/1.1.  The JDK request
        // factory sends a conventional JSON body and avoids protocol-upgrade
        // negotiation that can leave the body unread by the ASGI server.
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(3000);
        factory.setReadTimeout(5000);
        this.client = builder
            .baseUrl(baseUrl)
            .requestFactory(factory)
            .build();
        var healthFactory = new SimpleClientHttpRequestFactory();
        healthFactory.setConnectTimeout(1000); healthFactory.setReadTimeout(1000);
        this.healthClient = builder.clone().baseUrl(baseUrl).requestFactory(healthFactory).build();
    }
    public synchronized ModelStatus health() {
        if (cachedHealth != null && cachedHealth.checkedAt().plusSeconds(5).isAfter(java.time.Instant.now())) return cachedHealth;
        try {
            var body = healthClient.get().uri("/health").retrieve().body(HealthBody.class);
            boolean ready = body != null && body.loaded() && body.version() != null && !body.version().isBlank();
            cachedHealth = new ModelStatus(ready ? "ready" : "unavailable", ready ? body.version() : null, java.time.Instant.now());
        } catch (Exception error) { cachedHealth = new ModelStatus("unavailable", null, java.time.Instant.now()); }
        return cachedHealth;
    }
    public PredictionResponse predict(Map<String, Double> features) {
        return client.post().uri("/predict")
            .body(Map.of("features", features, "horizon_minutes", 120))
            .retrieve().body(PredictionResponse.class);
    }
}
