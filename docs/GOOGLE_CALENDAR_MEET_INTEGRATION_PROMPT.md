# 🚀 Production Google Calendar & Google Meet Integration Implementation Prompt

> **TaskFlow Enterprise Integration Specification**  
> **Status:** Production-Ready Blueprint  
> **Target Stack:** Next.js (App Router, TypeScript, Tailwind CSS, TanStack Query, Zustand) + Spring Boot / Next.js Server Route Handlers + PostgreSQL + Redis + Kafka / Outbox + Supabase Auth.

---

## 🎯 Executive Objective

Upgrade and unify Google Calendar and Google Meet in TaskFlow into an integrated, enterprise-grade Google Workspace integration.

Transform the meeting experience from isolated or mock video links into a unified model:
```text
Task / Project ──► TaskFlow Meeting ──► Google Calendar Event + Google Meet Conference (spaces.create)
```

Enable end-to-end workflows such as:
> *"Schedule a 30-minute Google Meet with Rahul tomorrow at 3 PM about the Payment API, check availability, send invites, and link the meeting directly to the task."*

---

## 🔍 Critical Flaws in Prior / Naive Implementations & How We Fix Them

| Prior / Naive Approach | Critical Flaw | Production Solution |
| :--- | :--- | :--- |
| **Manual URL Generation** | Generating fake slugs (`meet.google.com/xxx-yyyy-zzz`) causes `404 / Invalid meeting` errors. | **Always create real meetings via Google APIs**: Calendar `conferenceDataVersion=1` or Meet REST API `POST /v2/spaces`. |
| **Frontend Token Exchange** | Exposing `GOOGLE_CLIENT_SECRET` or `CALENDAR_TOKEN_ENCRYPTION_KEY` in frontend `.env` leads to credential leaks. | **Strict backend isolation**: Secrets and code exchange stay exclusively on the backend server. |
| **Missing First-Class Entity** | Storing meetings as loose chat attachments prevents linking to tasks or projects. | **Dedicated `meeting` table** with relational foreign keys (`organization_id`, `project_id`, `task_id`, `calendar_connection_id`). |
| **Scope Mismatch** | Using only `calendar.events` prevents managing ad-hoc Meet spaces or reading transcripts/recordings. | **Incremental OAuth scopes**: Request base calendar scopes first, and `meetings.space.created` / `readonly` when Meet features activate. |
| **Sync Loops** | Naive two-way sync without change tracking causes infinite ping-pong (`TaskFlow ⇄ Google`). | **Google `syncToken` + Private Extended Properties**: Embed TaskFlow resource markers to ignore self-originated webhooks. |
| **Hardcoded `prompt=consent`** | Forcing consent prompt on every login degrades UX and can break seamless token refreshes. | **Offline access with token lifecycle**: Persist encrypted `refresh_token`, refresh proactively at 55 minutes, and prompt only on `REAUTH_REQUIRED`. |

---

## 🔑 Credentials & Google Cloud Console Setup Guide

Follow these steps to obtain credentials and configure APIs:

### 1. Project & APIs
1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a project (e.g., `TaskFlow-Dev` or `TaskFlow-Production`).
3. Navigate to **APIs & Services > Library** and enable:
   - **Google Calendar API** (for calendar list, events, and conference binding)
   - **Google Meet REST API** (`meet.googleapis.com` for space provisioning, recordings, transcripts)
   - **Google People API / Google OAuth2 API** (for verified user identity)
   - **Google Workspace Events API** *(Optional/Phase 2 for webhooks)*
   - **Google Cloud Pub/Sub API** *(Optional/Phase 2 for real-time conference events)*

### 2. OAuth Consent Screen
1. Go to **APIs & Services > OAuth consent screen**.
2. Select **External** (or **Internal** for Workspace tenants).
3. Fill in App Name (`TaskFlow`), User Support Email, and Developer Contact.
4. Add Scopes:
   - `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile`
   - `https://www.googleapis.com/auth/calendar` (Calendar read/write)
   - `https://www.googleapis.com/auth/calendar.events` (Event & conference management)
   - `https://www.googleapis.com/auth/meetings.space.created` (Meet REST API ad-hoc space creation)
   - `https://www.googleapis.com/auth/meetings.space.readonly` (Meet records/artifacts)
5. Add your Google accounts under **Test Users** while in Testing mode.

### 3. OAuth 2.0 Client Credentials
1. Go to **APIs & Services > Credentials > Create Credentials > OAuth client ID**.
2. Choose **Web application**.
3. Set **Authorized JavaScript origins**:
   - `http://localhost:3000`
   - `https://api.taskflow.com` (Production backend)
4. Set **Authorized redirect URIs**:
   - `http://localhost:8080/api/v1/integrations/google/callback` (Backend development)
   - `http://localhost:3000/api/v1/calendar/callback/google` (Next.js server-side route handler)
   - `https://api.taskflow.com/api/v1/integrations/google/callback` (Production backend)
5. Copy **Client ID** and **Client Secret**.

---

## 🏛️ Target System Architecture

```text
TASKFLOW CLIENT (Next.js)
  │
  ├── UI Components: <MeetingCard />, <CreateMeetingDialog />, <JoinMeetingButton />
  └── AI Assistant: Natural Language Meeting Planner
        │
        ▼ REST / SSE
TASKFLOW BACKEND (Server Route Handlers / Spring Boot)
  │
  ├── 1. GoogleOAuthService & GoogleTokenService (AES-256-GCM token storage & proactive refresh)
  ├── 2. GoogleCalendarService (conferenceDataVersion=1 event scheduling)
  ├── 3. GoogleMeetService (spaces.create ad-hoc Meet provisioning)
  └── 4. MeetingService (TaskFlow task/project relational orchestration)
        │
        ├─────────────────────────────┬─────────────────────────────┐
        ▼                             ▼                             ▼
 Google Calendar API           Google Meet API             PostgreSQL Database
 (Events, Attendees,           (spaces.create,             - calendar_connection
  Meet Conference Links)        transcripts, records)      - external_calendar
                                                           - meeting (relational)
                                                           - calendar_event_mapping
```

---

## 🗄️ Relational Database Schema Specification

Run this migration to establish first-class meeting support:

```sql
-- 1. Extend or create calendar_connection
CREATE TABLE IF NOT EXISTS public.calendar_connection (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL DEFAULT 'GOOGLE', -- 'GOOGLE', 'MICROSOFT'
    provider_account_id VARCHAR(255),
    provider_email VARCHAR(255) NOT NULL,
    encrypted_access_token TEXT NOT NULL,
    encrypted_refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    scopes TEXT[] DEFAULT ARRAY[]::TEXT[],
    status VARCHAR(50) NOT NULL DEFAULT 'CONNECTED', -- 'CONNECTED', 'REAUTH_REQUIRED', 'DISCONNECTED'
    last_successful_sync_at TIMESTAMPTZ,
    last_error_code VARCHAR(100),
    last_error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_calendar_provider UNIQUE(user_id, provider)
);

-- 2. First-class Meeting Entity
CREATE TABLE IF NOT EXISTS public.meeting (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
    calendar_connection_id UUID REFERENCES public.calendar_connection(id) ON DELETE SET NULL,
    
    -- External Provider Identifiers
    provider VARCHAR(50) NOT NULL DEFAULT 'GOOGLE',
    meeting_type VARCHAR(50) NOT NULL DEFAULT 'GOOGLE_MEET',
    external_event_id VARCHAR(255),          -- Google Calendar Event ID
    external_space_id VARCHAR(255),          -- Google Meet space resource name (e.g. spaces/xxx-yyyy-zzz)
    meeting_url TEXT NOT NULL,               -- Real clickable Google Meet URL
    
    -- Metadata
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    timezone VARCHAR(100) DEFAULT 'UTC',
    status VARCHAR(50) NOT NULL DEFAULT 'SCHEDULED', -- 'SCHEDULED', 'LIVE', 'ENDED', 'CANCELLED', 'FAILED'
    
    -- Attendees & Host
    host_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    attendees JSONB DEFAULT '[]'::JSONB,    -- [{"email": "user@example.com", "name": "Rahul", "status": "accepted"}]
    
    -- Artifacts
    recording_url TEXT,
    transcript_url TEXT,
    transcript_summary TEXT,
    action_items JSONB DEFAULT '[]'::JSONB,
    
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for lightning-fast queries
CREATE INDEX IF NOT EXISTS idx_meeting_task_id ON public.meeting(task_id);
CREATE INDEX IF NOT EXISTS idx_meeting_project_id ON public.meeting(project_id);
CREATE INDEX IF NOT EXISTS idx_meeting_start_time ON public.meeting(start_time);
CREATE INDEX IF NOT EXISTS idx_meeting_external_event_id ON public.meeting(external_event_id);
```

---

## 🛠️ Step-by-Step Implementation Guide

### Phase 1: Secure OAuth 2.0 & Token Refresh Service
1. **Server-Side Token Exchange**:
   - Send authorization request with `access_type=offline`, `prompt=consent` (on first connect), and `include_granted_scopes=true`.
   - Implement authorization code exchange strictly in a protected server endpoint.
   - Encrypt `access_token` and `refresh_token` using AES-256-GCM before persisting.
2. **Centralized Token Manager (`GoogleTokenService`)**:
   - Always check `token_expires_at`. If within 5 minutes of expiration, use `refresh_token` to retrieve a fresh `access_token`.
   - On HTTP 401 or revoked consent: mark status as `REAUTH_REQUIRED`, notify user to reconnect, and abort retries.

### Phase 2: Scheduled Meetings (Google Calendar + Meet Conference)
1. When a user schedules a meeting from a task, project, or sprint calendar:
   - Call Google Calendar API `POST https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events?conferenceDataVersion=1`.
   - Provide payload with `conferenceData`:
     ```json
     {
       "summary": "Payment API Technical Review",
       "description": "TaskFlow Task: https://app.taskflow.com/app/tasks/123",
       "start": { "dateTime": "2026-10-02T15:00:00+05:30" },
       "end": { "dateTime": "2026-10-02T15:30:00+05:30" },
       "attendees": [{ "email": "rahul@example.com" }],
       "conferenceData": {
         "createRequest": {
           "requestId": "taskflow-meet-<UUID>",
           "conferenceSolutionKey": { "type": "hangoutsMeet" }
         }
       },
       "extendedProperties": {
         "private": {
           "taskflow_resource_id": "task-uuid",
           "taskflow_origin": "true"
         }
       }
     }
     ```
   - Extract the generated `entryPoints[0].uri` (e.g., `https://meet.google.com/abc-defg-hij`) and `conferenceData.conferenceId`.
   - Store both the Calendar event ID and Meet URL in the `meeting` table linked to `task_id` and `project_id`.

### Phase 3: Instant / Standalone Meetings (Google Meet REST API v2)
1. For chat `/meet` command or instant standup buttons:
   - Call Google Meet REST API `POST https://meet.googleapis.com/v2/spaces`.
   - Scope required: `https://www.googleapis.com/auth/meetings.space.created`.
   - Payload:
     ```json
     {
       "config": {
         "accessType": "OPEN"
       }
     }
     ```
   - Store `space.name` (resource ID, e.g. `spaces/123456`) and `space.meetingUri` in the `meeting` table.
   - Insert rich meeting badge into the chat stream with real URL and host status.

### Phase 4: Two-Way Synchronization & Sync-Loop Prevention
1. Use Google Calendar `syncToken` for incremental changes instead of scanning all historical events.
2. Read `extendedProperties.private.taskflow_origin`. If the event was created by TaskFlow, skip echo updates back into TaskFlow to avoid infinite loops.

### Phase 5: UI & UX Components
1. **`<MeetingCard />`**: Compact component showing meeting title, status, participants, time, and prominent **"Join Google Meet"** button.
2. **`<CreateMeetingDialog />`**: Dialog with fields for Title, Date, Time, Duration, Project, Task, Attendee search (resolves TaskFlow members to verified emails), and toggle for *"Generate Google Meet"*.
3. **Task Detail View Integration**: Render active or upcoming meetings directly within the task header or sidebar.
4. **Responsive Layout**: Drawer/Sheet on mobile (320px–430px) and compact cards on desktop (1024px–1920px).

### Phase 6: AI Assistant Tool Registry Integration
Register these tools with the TaskFlow AI agent:
1. `check_calendar_availability(user_ids, date_range)`: Queries Google Calendar FreeBusy API to locate open slots.
2. `create_google_meet(task_id, project_id, title, start_time, duration_minutes, attendee_ids)`: Orchestrates the entire flow server-side.
3. `cancel_meeting(meeting_id)`: Requires explicit user confirmation action before deleting.

---

## 🔒 Security & Privacy Non-Negotiables
- **Zero Token Leakage**: Tokens must never be present in Next.js browser state, `localStorage`, client console logs, or AI prompt traces.
- **RBAC Validation**: Always verify organization and workspace authorization via `AuthorizationService` before executing calendar or meeting actions.
- **No Hallucinated Attendees**: AI must never invent attendee emails; resolve attendee names against verified TaskFlow members in the workspace.
