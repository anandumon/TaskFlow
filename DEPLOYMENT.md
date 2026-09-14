# TaskFlow Deployment & CI/CD Guide

This document explains how to configure GitHub Actions, deploy the **Backend (Spring Boot)** and **Frontend (Next.js)**, and configure environment variables for production.

---

## 1. GitHub Actions CI/CD Pipeline

The pipeline is defined in [`.github/workflows/ci-cd.yml`](.github/workflows/ci-cd.yml).
Whenever you push to `main` or create a pull request, GitHub Actions automatically:
- Compiles the **Spring Boot backend** with Java 21 Temurin and packages `taskflow-backend.jar`.
- Verifies TypeScript and builds the **Next.js web app** with Node.js 20.
- Archives build artifacts for release.

### Adding Secrets in GitHub
1. Go to your repository on GitHub: `https://github.com/anandumon/TaskFlow`
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add:

#### Backend Secrets
| Secret | Description |
| :--- | :--- |
| `DB_URL` | Supabase Pooler JDBC URL (e.g. `jdbc:postgresql://aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require&prepareThreshold=0`) |
| `DB_USERNAME` | Supabase database user (e.g. `postgres.dxrcfczdfstnymbeicmq`) |
| `DB_PASSWORD` | Supabase database password |
| `SPRING_PROFILES_ACTIVE` | Set to `supabase` |
| `JWT_SECRET` | 256-bit string for signing JWT tokens |
| `CORS_ORIGINS` | Comma-separated frontend domains (e.g. `https://taskflow.vercel.app,http://localhost:3000`) |
| `MAIL_USERNAME` | Gmail address for sending alerts & invitations |
| `MAIL_PASSWORD` | 16-character Gmail App Password |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret |
| `TASKFLOW_CALENDAR_GOOGLE_CLIENT_ID` | *(Optional)* Google Calendar Client ID |
| `TASKFLOW_CALENDAR_GOOGLE_CLIENT_SECRET` | *(Optional)* Google Calendar Client Secret |

#### Frontend Secrets
| Secret | Description |
| :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Public URL of your deployed backend (e.g. `https://taskflow-api.onrender.com` or `http://localhost:8080`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL (`https://dxrcfczdfstnymbeicmq.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon public API key |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth Client ID for sign-in & calendar buttons |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret |

---

## 2. Deploying the Frontend (Vercel)

1. Go to [Vercel](https://vercel.com) and click **Add New Project**.
2. Import the GitHub repository: `anandumon/TaskFlow`.
3. Set **Root Directory** to: `apps/web`.
4. In **Environment Variables**, add:
   - `NEXT_PUBLIC_API_URL`: Your deployed backend URL
   - `NEXT_PUBLIC_SUPABASE_URL`: `https://dxrcfczdfstnymbeicmq.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
   - `NEXT_PUBLIC_GOOGLE_CLIENT_ID`: Your Google OAuth client ID
5. Click **Deploy**.

---

## 3. Deploying the Backend (Render / Railway / Docker)

### Option A: Render (Free Web Service)
1. Go to [Render](https://render.com) → **New Web Service**.
2. Connect your repository: `anandumon/TaskFlow`.
3. Configure:
   - **Root Directory**: `services/backend`
   - **Environment**: `Java` (or Docker)
   - **Build Command**: `./gradlew bootJar -x test`
   - **Start Command**: `java -jar build/libs/taskflow-backend.jar`
4. Add the environment variables from the Backend table above.

### Option B: Railway
1. Go to [Railway](https://railway.app) → **New Project from GitHub**.
2. Select `services/backend` as root directory.
3. Railway automatically detects Gradle and starts Spring Boot.

---

## 4. Google Cloud Console Configuration

To allow login and calendar sync in production:
1. Open [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
2. Click your OAuth 2.0 Client ID.
3. Add your production redirect URIs under **Authorized redirect URIs**:
   - `https://your-frontend-domain.com/app/calendar/callback`
   - `https://your-frontend-domain.com/auth/callback`
   - `https://your-frontend-domain.com/callback`
   - `http://localhost:3000/app/calendar/callback` (for local dev)
4. Under **Authorized JavaScript origins**:
   - `https://your-frontend-domain.com`
   - `http://localhost:3000`
5. Ensure **Google Calendar API** is enabled under **APIs & Services** → **Library**.
