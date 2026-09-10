package com.codearena.service;

import com.codearena.exception.ForbiddenException;
import com.codearena.exception.NotFoundException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class RunResultService {
    private static final String PREFIX = "codearena:run:result:";

    private final StringRedisTemplate redis;
    private final ObjectMapper objectMapper;

    @Value("${app.judge.run-result-ttl-seconds:900}")
    private long resultTtlSeconds;

    public void create(String runJobId, Long userId) {
        write(runJobId, Map.of("runJobId", runJobId, "userId", userId, "status", "QUEUED"));
    }

    public Map<String, Object> getForUser(String runJobId, Long userId) {
        Map<String, Object> result = get(runJobId);
        Number owner = (Number) result.get("userId");
        if (owner == null || owner.longValue() != userId.longValue()) {
            throw new ForbiddenException("Access denied");
        }
        return result;
    }

    public Map<String, Object> get(String runJobId) {
        try {
            String json = redis.opsForValue().get(PREFIX + runJobId);
            if (json == null) throw new NotFoundException("Run result not found or expired");
            return objectMapper.readValue(json, Map.class);
        } catch (NotFoundException e) {
            throw e;
        } catch (Exception e) {
            throw new NotFoundException("Run result not found");
        }
    }

    public boolean isTerminal(Map<String, Object> value) {
        Object status = value.get("status");
        return status != null && !"QUEUED".equals(status) && !"RUNNING".equals(status);
    }

    private void write(String runJobId, Map<String, Object> value) {
        try {
            redis.opsForValue().set(PREFIX + runJobId, objectMapper.writeValueAsString(value),
                    Duration.ofSeconds(resultTtlSeconds));
        } catch (Exception e) {
            throw new IllegalStateException("Unable to persist run state", e);
        }
    }
}
