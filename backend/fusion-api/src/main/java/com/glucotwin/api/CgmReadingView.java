package com.glucotwin.api;

import java.time.Instant;

public record CgmReadingView(String eventId, Instant observedAt, double glucoseMgDl, String source, Instant receivedAt) {
    public CgmReadingView(String eventId, Instant observedAt, double glucoseMgDl, String source) { this(eventId, observedAt, glucoseMgDl, source, null); }
}
