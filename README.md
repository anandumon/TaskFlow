# 🚀 TaskFlow

TaskFlow is a modern, open-source project management and release orchestration platform designed for software engineering teams. It brings together sprint planning, interactive task boards, Git feature branch tracking, and multi-stage environment promotion (**DEV → SIT → UAT → RELEASE → MAIN**) with multi-tenant workspaces.

---

## 🐳 Run with Docker (Recommended)

The easiest way to get TaskFlow running with a database is using Docker Compose:

### 1. Clone the repository
```bash
git clone https://github.com/anandumon/TaskFlow.git
cd TaskFlow
```

### 2. Start all services
```bash
docker compose up -d
```

### 3. Open in your browser
Navigate to **[http://localhost:3000](http://localhost:3000)**.

To stop the containers:
```bash
docker compose down
```

---

## 💻 Run Locally (Without Docker)

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm** or **pnpm**
- **PostgreSQL**: A local or cloud PostgreSQL instance (e.g. Supabase)

### 2. Setup & Install
```bash
cd apps/web
npm install
```

### 3. Configure Environment
Create a `.env` file in `apps/web`:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/taskflow
JWT_SECRET=your_jwt_secret_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

*Note: If using a fresh database, run the `supabase_schema.sql` script located in the root folder to create all tables.*

### 4. Start Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)**.

---

## 📚 Documentation & Integrations

- **[Google Calendar & Meet Workflow](docs/GOOGLE_CALENDAR_MEET_WORKFLOW.md)**: Architecture, Google Cloud setup, and runtime sequence.
- **[Google Integration Implementation Prompt](docs/GOOGLE_CALENDAR_MEET_INTEGRATION_PROMPT.md)**: Production implementation blueprint for Calendar + Meet.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
