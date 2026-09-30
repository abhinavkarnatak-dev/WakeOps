# WakeOps

WakeOps is an AI-powered incident alert and voice notification project. Monitoring systems send
alerts to WakeOps, which creates a durable incident, notifies the assigned engineer, and eventually
supports a realtime voice conversation for acknowledgement and safe investigation.

Milestone 1 currently includes:

- an npm-workspace monorepo;
- a Next.js landing page, Google sign-in, and organization onboarding;
- an Express API with a lightweight `GET /health` endpoint;
- a PostgreSQL/Prisma schema for users, OAuth accounts, sessions, organizations, and memberships;
- a placeholder worker deployable for later Temporal and RabbitMQ consumers;
- strict TypeScript, formatting, linting, and initial tests.

No voice, monitoring, Temporal, RabbitMQ, or AI provider code is implemented yet.

## Repository layout

```text
apps/
  web/          Next.js UI, Google sign-in, onboarding, and later the dashboard
  api/          Express HTTP API, provider webhooks, callbacks, and voice WebSocket endpoint
  workers/      Temporal workers and RabbitMQ notification consumers (later)
packages/
  database/     Prisma schema and shared PostgreSQL client
  shared/       Small provider-neutral types and validation helpers
  integrations/ Monitoring/GitHub/Slack connection adapters (later)
  alerts/       Common alert model, normalization, fingerprinting, and dedupe (later)
  incidents/    Incident creation, state changes, and timeline (later)
  workflows/    Deterministic Temporal workflow definitions and activities (later)
  telephony/    Twilio calls and callback handling (later)
  voice/        Twilio media, Deepgram, ElevenLabs, and turn control (later)
  agent/        LLM provider, read-only tools, and per-call session context (later)
  notifications/RabbitMQ events plus email and Slack delivery (later)
  observability/Logs, traces, metrics, Langfuse, and cost measurements (later)
docs/
  architecture.md
```

These `packages` are code boundaries, not independently deployed microservices. We will only give a
package its own configuration when real code arrives.

## What runs where

- **Web process:** pages, Google OAuth, browser sessions, onboarding, and dashboard actions.
- **API process:** quick HTTP work: monitoring webhooks, OAuth callbacks where needed, Twilio status
  callbacks, health endpoints, and the realtime media WebSocket. A webhook will create or attach an
  alert and start/signal Temporal, then return; it will never wait for a phone call.
- **Worker process:** long-running or queue-driven work: Temporal workflows/activities and RabbitMQ
  email/Slack consumers. This process can be restarted without losing durable Temporal progress.
- **PostgreSQL:** permanent product truth.
- **Redis later:** cache and rate limiting only.
- **Temporal later:** durable incident workflow progress.
- **RabbitMQ later:** independent notification delivery.

For a small deployment, API and worker code can use the same repository and shared packages, while
running as separate Render processes. This isolates long-running jobs from web request handling
without introducing microservices.

## Local setup

Requirements: Node.js 22+, npm, Docker, and Google OAuth credentials.

1. Copy `.env.example` to `.env` and fill in `AUTH_SECRET`, `AUTH_GOOGLE_ID`, and
   `AUTH_GOOGLE_SECRET`.
2. In Google Cloud, add this local redirect URI:
   `http://localhost:3000/api/auth/callback/google`.
3. Start PostgreSQL:

   ```bash
   docker compose up -d postgres
   ```

4. Install packages, generate Prisma Client, and apply the migration:

   ```bash
   npm install
   npm run db:generate
   npm run db:migrate
   ```

5. Start the web app and API:

   ```bash
   npm run dev
   ```

Open `http://localhost:3000`. The API health endpoint is `http://localhost:4000/health`.

Generate `AUTH_SECRET` with `npx auth secret` or another cryptographically secure random generator.
Do not commit the resulting `.env` file.

## Test and quality commands

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Manual onboarding test:

1. Open the landing page and choose **Get started**.
2. Sign in with a Google account allowed by your Google OAuth consent-screen configuration.
3. Enter an organization name.
4. Confirm that the dashboard shows that organization.
5. Sign out and sign back in; you should return to the existing organization rather than creating a
   second one.

## Environment variables

The complete planned list is in `.env.example`. Only PostgreSQL and Google/Auth.js variables are
needed in this milestone.

- **Core:** `NODE_ENV`, `WEB_URL`, `API_URL`, `PORT`, `LOG_LEVEL`, `ENCRYPTION_KEY`
- **PostgreSQL:** `DATABASE_URL`
- **Google/Auth.js:** `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`
- **Temporal:** `TEMPORAL_ADDRESS`, `TEMPORAL_NAMESPACE`, `TEMPORAL_TASK_QUEUE`,
  `TEMPORAL_API_KEY`
- **RabbitMQ:** `AMQP_URL`
- **Redis:** `REDIS_URL`
- **Twilio:** `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`,
  `TWILIO_WEBHOOK_BASE_URL`
- **Deepgram:** `DEEPGRAM_API_KEY`
- **ElevenLabs:** `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`
- **Email:** `RESEND_API_KEY`, `EMAIL_FROM`
- **Slack:** `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, `SLACK_SIGNING_SECRET`,
  `SLACK_REDIRECT_URI`
- **GitHub App:** `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_WEBHOOK_SECRET`,
  `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
- **Monitoring:** `ALERTMANAGER_WEBHOOK_SECRET`, `GRAFANA_WEBHOOK_SECRET`,
  `AWS_SNS_ALLOWED_TOPIC_ARNS`
- **ChatGPT plan connection:** `OPENAI_CHATGPT_CLIENT_ID`, `OPENAI_CHATGPT_REDIRECT_URI`; only for
  an approved official Sign in with ChatGPT integration - never copied Codex CLI credentials
- **Observability:** `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_SERVICE_NAME`,
  `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_BASE_URL`

## Current limitations

- The first schema contains only authentication and organization models. Incident models arrive in
  their relevant milestone so we can explain and test them carefully.
- Google login requires real OAuth credentials and a running PostgreSQL database.
- The local Compose file starts only PostgreSQL today. Redis, RabbitMQ, Prometheus, and Grafana will
  be added when the application actually uses them.
- Auth.js v5 is currently installed from its beta release line because it provides the modern
  Next.js App Router API. We keep its usage behind `src/auth.ts` so an upgrade is localized.

See [docs/architecture.md](docs/architecture.md) for the architecture and flow.
