package com.taskflow.calendar.provider;

import com.taskflow.calendar.dto.*;

import java.util.List;

public interface CalendarProvider {

    String getProviderName();

    String buildAuthorizationUrl(String redirectUri, String state);

    OAuthTokenResponse exchangeCode(String code, String redirectUri);

    OAuthTokenResponse refreshAccessToken(String refreshToken);

    List<ExternalCalendarDto> listCalendars(String accessToken);

    ExternalCalendarDto getCalendar(String accessToken, String calendarId);

    CalendarEventDto createEvent(String accessToken, String calendarId, CalendarEventRequest request);

    CalendarEventDto updateEvent(String accessToken, String calendarId, String externalEventId, CalendarEventRequest request);

    void deleteEvent(String accessToken, String calendarId, String externalEventId);

    CalendarSyncResult fullSync(String accessToken, String calendarId);

    CalendarSyncResult incrementalSync(String accessToken, String calendarId, String syncTokenOrDelta);
}
