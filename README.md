# WakeOps

WakeOps is an AI-powered incident alert and voice notification project. Monitoring systems send
alerts to WakeOps, which creates a durable incident, notifies the assigned engineer, and eventually
supports a realtime voice conversation for acknowledgement and safe investigation.

Milestone 1 currently includes:

- an npm-workspace monorepo;
- a Next.js landing page, Google sign-in, and organization onboarding;
- an Express API with a lightweight `GET /health` endpoint;
- a PostgreSQL/Prisma schema for users, OAuth accounts, sessions, organizations, and memberships;
- a separate worker process for Temporal workflows and later RabbitMQ consumers;
- strict TypeScript, formatting, linting, and initial tests.

Milestone 2 adds organization setup at `/dashboard/setup`: engineer contacts, applications,
environments, monitored hosts, service deployments, and primary/secondary on-call assignments. One
host can run many services, and contacts are assigned once for each deployed service. Only
organization admins can save setup. Phone numbers are validated in
international format and masked in the saved contact list. Engineers do not need product accounts.

Realtime voice, RabbitMQ, and AI provider code are not implemented yet.

Phase 3 added a safe Grafana connection test. Grafana can send its contact-point test
notification to `POST /webhooks/grafana/:organizationId`. Each organization generates its own
Bearer secret. WakeOps stores only the secret hash, validates the JSON, stores a small test receipt,
and shows the result at `/dashboard/integrations`.

Phase 4 normalizes Grafana alerts, maps their host, service and environment, finds the assigned
engineers, calculates stable fingerprints, stores every meaningful alert event, and creates or
updates one active incident. Exact repeated deliveries are ignored safely. Resolved notifications
close the matching active incident, while a later recurrence can create a new incident.

Phase 5 connects incident creation to Temporal Cloud. A new or repeated firing alert idempotently
starts one workflow named `incident-{incidentId}`. The worker changes the incident to `NOTIFYING`
and waits durably for acknowledgement or resolution. Acknowledgement does not resolve the incident.
A resolved Grafana notification signals the workflow and completes it. Worker restarts do not lose
workflow progress.

Phase 6 adds the first Twilio voice path. New Temporal workflows create one durable primary-engineer
call attempt, submit it through Twilio, play a deterministic incident message, validate Twilio
webhook signatures, and record call status callbacks. Realtime AI conversation and escalation are
still later phases.

## Repository layout

```text
apps/
  web/          Next.js UI, Google sign-in, onboarding, and later the dashboard
  api/          Express HTTP API, provider webhooks, callbacks, and voice WebSocket endpoint
  workers/      Temporal worker, database Activities, and later RabbitMQ consumers
packages/
  database/     Prisma schema and shared PostgreSQL client
  shared/       Small provider-neutral types and validation helpers
  integrations/ Grafana parsing plus future GitHub and Slack connection adapters
  alerts/       Common alert model, normalization, fingerprints, and delivery keys
  incidents/    Resource mapping, dedupe, incident creation, resolution, and audit events
  workflows/    Deterministic Temporal workflows, signals, state, and Activity contracts
  telephony/    Twilio calls, TwiML, webhook validation, and call status handling
  voice/        Twilio media, Deepgram, ElevenLabs, and turn control (later)
  agent/        LLM provider, read-only tools, and per-call session context (later)
  notifications/RabbitMQ events plus email and Slack delivery (later)
  observability/Logs, traces, metrics, Langfuse, and cost measurements (later)
docs/
  architecture.md
  monitoring-phase-plan.md
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
- **Temporal Cloud:** durable incident workflow progress and timers.
- **RabbitMQ later:** independent notification delivery.

For a small deployment, API and worker code can use the same repository and shared packages, while
running as separate Render processes. This isolates long-running jobs from web request handling
without introducing microservices.

## Local setup

Requirements: Node.js 22+, npm, Docker, and Google OAuth credentials.

1. Copy `.env.example` to `.env.local` and fill in PostgreSQL, Google/Auth.js, and Temporal Cloud
   values.
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

5. Start the web app, API, and Temporal worker:

   ```bash
   npm run dev
   ```

Open `http://localhost:3000`. The API health endpoint is `http://localhost:4000/health`. The worker
connects to Temporal Cloud and polls the queue configured by `TEMPORAL_TASK_QUEUE`.

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

The complete planned list is in `.env.example`. PostgreSQL, Google/Auth.js, Grafana, Temporal Cloud,
and Twilio configuration are used by the implemented milestones.

- **Core:** `NODE_ENV`, `WEB_URL`, `API_URL`, `WEBHOOK_PUBLIC_BASE_URL`, `PORT`, `LOG_LEVEL`,
  `ENCRYPTION_KEY`
- **PostgreSQL:** `DATABASE_URL`
- **Google/Auth.js:** `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`
- **Temporal:** `TEMPORAL_ADDRESS`, `TEMPORAL_NAMESPACE`, `TEMPORAL_TASK_QUEUE`,
  `TEMPORAL_API_KEY`
- **RabbitMQ:** `AMQP_URL`
- **Redis:** `REDIS_URL`
- **Twilio:** `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`,
  `TWILIO_WEBHOOK_BASE_URL`, `TWILIO_TRIAL_MODE`
- **Deepgram:** `DEEPGRAM_API_KEY`
- **ElevenLabs:** `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`
- **Email:** `RESEND_API_KEY`, `EMAIL_FROM`
- **Slack:** `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, `SLACK_SIGNING_SECRET`,
  `SLACK_REDIRECT_URI`
- **GitHub App:** `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_WEBHOOK_SECRET`,
  `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
- **ChatGPT plan connection:** `OPENAI_CHATGPT_CLIENT_ID`, `OPENAI_CHATGPT_REDIRECT_URI`; only for
  an approved official Sign in with ChatGPT integration - never copied Codex CLI credentials
- **Observability:** `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_SERVICE_NAME`,
  `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_BASE_URL`

## Current limitations

- Engineers, applications, environments, and hosts support creating, editing, and deleting. Linked
  records cannot be deleted until their service deployments or host links are removed. Deleting a
  host removes all of its service deployments and assignments. Rotating on-call schedules,
  repository mappings, and notification destinations will be added in later milestones.
- A Grafana resource identifier is unique within its organization. Each organization currently has
  one Grafana integration. Supporting several Grafana instances per organization can be added later.
- Google login requires real OAuth credentials and a running PostgreSQL database.
- The local Compose file starts only PostgreSQL today. Redis and RabbitMQ will be added when the
  application actually uses them. Grafana may be hosted separately or run locally for learning.
- Auth.js v5 is currently installed from its beta release line because it provides the modern
  Next.js App Router API. We keep its usage behind `src/auth.ts` so an upgrade is localized.
- Temporal acknowledgement signals can currently be sent by code, but the voice agent and dashboard
  acknowledgement buttons arrive in later phases.
- The current Twilio call plays a fixed incident message and records call states. It does not yet
  stream audio, understand speech, acknowledge through voice, retry no-answer calls, or escalate.

See [docs/architecture.md](docs/architecture.md) for the architecture and flow. The guided monitoring
order is in [docs/monitoring-phase-plan.md](docs/monitoring-phase-plan.md).

## Test organization setup

1. Sign in and open **Manage organization setup** on the dashboard.
2. Add two engineers with valid email addresses. Select their countries and enter their local numbers.
3. Add `payment-service`, `auth-service`, and `production`.
4. Add one Grafana-monitored host with identifier `i-111`.
5. Attach both services to the same host and choose contacts for each service.
6. Confirm the host card shows both services and the dashboard reports one host and two deployments.
7. Try attaching the same service and environment to the same host twice. It should reject the duplicate.
8. Try choosing the same engineer for both roles. It should reject the assignment.
9. Edit an engineer, service, environment, or host and confirm the displayed values update.
10. Delete one service deployment and confirm the host and its other service remain.
11. Cancel a host deletion and confirm nothing changes. Then delete an unused record.

`libphonenumber-js` supplies the country calling-code list and validates local numbers. The selected
country and normalized international number are saved together. This avoids maintaining our own
numbering rules. Older contacts infer their country from the saved number when opened for editing.

Database integration tests use `DATABASE_URL` and roll back their fixtures. Run them against a local
test database with the migrations applied:

```powershell
$env:DATABASE_URL='postgresql://wakeops:wakeops@localhost:5433/wakeops?schema=public'
npm run test:integration
```

Local PostgreSQL can use another port when 5432 is occupied:

```powershell
$env:POSTGRES_PORT='5433'
docker compose up -d --wait postgres
```

No new provider secrets are required for milestone 2.

## Test the Grafana webhook

1. Start the API and web app.
2. Open `/dashboard/integrations` and generate Grafana credentials.
3. Copy the secret when it is shown. WakeOps will not show it again.
4. In a Grafana Webhook contact point, use the URL shown on the integrations page.
5. Set the authorization scheme to `Bearer` and paste the generated secret into credentials.
6. Click Grafana's Test button.
7. The WakeOps page should show the received alert and connected status within a few seconds.

Grafana running in local Docker should use `host.docker.internal` instead of `localhost` to reach
the API on the host computer. Grafana Cloud requires a publicly reachable HTTPS API URL.

## Test the Temporal workflow

1. Keep the Temporal worker running with `npm run dev -w @wakeops/workers`.
2. Send a mapped custom firing test from Grafana.
3. Open Temporal Cloud and find `incident-{incidentId}`.
4. Confirm the workflow is running and the PostgreSQL incident is `NOTIFYING`.
5. Send the matching resolved notification from Grafana.
6. Confirm Temporal marks the workflow completed and PostgreSQL marks the incident `RESOLVED`.

The workflow Activity retry policy handles temporary technical failures such as a database timeout.
No-answer call retries and engineer escalation are business rules for a later workflow phase.

## Test the basic Twilio call

1. Pause any repeating Grafana test rule before adding live Twilio credentials.
2. Add the Twilio Account SID, Auth Token, Twilio phone number, and public HTTPS webhook base URL to
   `.env.local`.
3. Set `TWILIO_TRIAL_MODE=true` for the limited Voice trial, or leave it false for a full account.
4. On a Twilio trial account, verify the engineer's destination number in Twilio first.
5. Start WakeOps and trigger one controlled firing alert.
6. Confirm PostgreSQL contains one `CallAttempt` with a Twilio Call SID.
7. Answer the call and confirm the deterministic incident message is played.
8. Confirm callbacks update the attempt. Trial mode provides fewer intermediate statuses.
9. Resolve the alert after the call test.
