package com.glucotwin.api;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class TwinClient {
    private final RestClient client;
    public TwinClient(RestClient.Builder builder,@Value("${ml.service.base-url:http://ml-service:8000}") String baseUrl) {
        var factory=new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(3000);factory.setReadTimeout(60000);
        client=builder.clone().baseUrl(baseUrl).requestFactory(factory).build();
    }
    public JsonNode forecast(JsonNode input) {
        return client.post().uri("/twin/forecast").body(input).retrieve().body(JsonNode.class);
    }
}
