package com.taskflow.calendar.provider;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class CalendarProviderFactory {

    private final Map<String, CalendarProvider> providerMap = new ConcurrentHashMap<>();

    public CalendarProviderFactory(List<CalendarProvider> providers) {
        for (CalendarProvider p : providers) {
            providerMap.put(p.getProviderName().toUpperCase(), p);
        }
    }

    public CalendarProvider get(String providerName) {
        if (providerName == null) {
            throw new IllegalArgumentException("Calendar provider name cannot be null");
        }
        CalendarProvider provider = providerMap.get(providerName.trim().toUpperCase());
        if (provider == null) {
            throw new IllegalArgumentException("Unsupported calendar provider: " + providerName);
        }
        return provider;
    }

    public boolean supports(String providerName) {
        return providerName != null && providerMap.containsKey(providerName.trim().toUpperCase());
    }
}
