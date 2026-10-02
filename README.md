# WakeOps

WakeOps turns Grafana alerts into a durable incident response workflow.

When a configured Grafana alert fires, WakeOps:

1. receives and verifies the Grafana webhook;
2. normalizes alert labels and annotations;
3. maps the alert to an organization, host, service, and environment;
4. ignores duplicate deliveries of the same active problem;
5. creates or updates an incident in PostgreSQL;
6. starts a Temporal workflow;
7. calls the assigned on-call engineer through Twilio;
8. retries and escalates to the senior engineer when the call is not answered;
9. sends email and optional Slack notifications through RabbitMQ;
10. records call attempts, notification attempts, acknowledgement, and an audit timeline.

The current project is intentionally focused. Grafana is the only monitoring provider, and each call
plays a fixed incident message before the workflow records the call result.

## What is shipped

- Next.js and TypeScript web application with a dark operations dashboard.
- Google sign-in with Auth.js and PostgreSQL-backed sessions.
- Organization onboarding for engineers, applications, environments, hosts, and service deployments.
- One host with multiple services, with an on-call and optional senior assignment per service.
- Grafana webhook connection with organization-specific Bearer secret generation and hash-only storage.
- Grafana alert normalization, label mapping, fingerprinting, and duplicate delivery protection.
- PostgreSQL incident records, alert events, call attempts, notification attempts, and audit events.
- Temporal workflow with durable waiting, on-call retry, senior escalation, and completion on acknowledgement.
- Twilio outbound calls, TwiML message responses, signed callbacks, and call status tracking.
- Resend email delivery through a RabbitMQ notification queue.
- Slack OAuth, destination selection, test messages, and incident messages through RabbitMQ.
- Incident overview, incident detail pages, organization setup, integrations, polling updates, and filters.
- Structured API and worker logs with incident and provider identifiers.

## Product flow

Grafana alert -> Express webhook -> verify and normalize -> map service -> deduplicate ->
PostgreSQL incident -> Temporal workflow -> Twilio call.

The same workflow publishes notification jobs to RabbitMQ. Email and Slack consumers deliver those
jobs independently. Twilio callbacks update PostgreSQL and signal Temporal. The dashboard reads the
durable incident record and refreshes it periodically.

The webhook only performs quick validation and persistence. It does not keep the HTTP request open
while a phone call runs. Temporal owns the long-running call and escalation process. PostgreSQL is
the durable application source of truth. RabbitMQ only transports notification jobs.

## Repository layout

    apps/web/             Next.js UI, authentication, onboarding, dashboard, and integrations
    apps/api/             Express API, Grafana webhook, Twilio callbacks, and workflow signals
    apps/workers/         Temporal worker and RabbitMQ email and Slack consumers
    packages/database/    Prisma schema and PostgreSQL client
    packages/shared/      Shared validation and setup types
    packages/integrations Grafana payload parsing and secret helpers
    packages/alerts/      Normalized alert types and identity helpers
    packages/incidents/   Mapping, dedupe, incident creation, resolution, and audit events
    packages/workflows/   Deterministic Temporal workflow state and contracts
    packages/telephony/   Twilio request creation and provider boundaries
    packages/notifications Notification event and provider-neutral notification types

These are code boundaries inside one repository. They are not separate microservices. For local
development, the web app, API, and worker run as three processes from the same repository.

## What runs where

- Web serves pages, Google login, organization actions, integration screens, and incident views.
- API handles fast HTTP requests, Grafana webhooks, Twilio callbacks, health checks, and Temporal signals.
- Worker runs Temporal workflows and activities, publishes notification jobs, and consumes email and Slack queues.
- PostgreSQL stores users, organizations, mappings, incidents, attempts, and audit events.
- Temporal Cloud stores durable workflow progress and timers.
- RabbitMQ delivers independent email and Slack jobs.
- Redis is reserved for supporting cache or rate limiting. It is not the product source of truth.

## Local development

Requirements:

- Node.js 22 or newer
- npm
- Docker Desktop
- PostgreSQL
- Google OAuth credentials
- Temporal Cloud credentials

Setup:

1. Install dependencies with npm install.
2. Copy .env.example to .env.local and fill in the required values.
3. Add this Google OAuth redirect URI in Google Cloud:
   http://localhost:3000/api/auth/callback/google
4. Start PostgreSQL and RabbitMQ:
   docker compose up -d postgres rabbitmq
5. Generate Prisma Client and apply migrations:
   npm run db:generate
   npm run db:migrate
6. Start the web app, API, and worker:
   npm run dev

Open http://localhost:3000. The API health endpoint is http://localhost:4000/health.

Generate AUTH_SECRET with npx auth secret or another secure random generator. Never commit
.env.local, OAuth secrets, provider tokens, or database credentials.

Useful commands:

    npm test
    npm run typecheck
    npm run lint
    npm run build
    npm run db:studio

## Environment variables

The following variables are used by the current application. Empty optional provider values disable
that provider until it is configured.

| Group                 | Variables                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------ |
| Core                  | NODE_ENV, PORT, LOG_LEVEL, WEB_URL, API_URL, WEBHOOK_PUBLIC_BASE_URL                                   |
| PostgreSQL            | DATABASE_URL                                                                                           |
| Google and Auth.js    | AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, AUTH_TRUST_HOST                                       |
| Temporal Cloud        | TEMPORAL_ADDRESS, TEMPORAL_NAMESPACE, TEMPORAL_TASK_QUEUE, TEMPORAL_API_KEY                            |
| RabbitMQ              | AMQP_URL                                                                                               |
| Redis support         | REDIS_URL                                                                                              |
| Credential encryption | ENCRYPTION_KEY                                                                                         |
| Twilio                | TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, TWILIO_WEBHOOK_BASE_URL, TWILIO_TRIAL_MODE |
| Resend email          | RESEND_API_KEY, EMAIL_FROM                                                                             |
| Slack OAuth           | SLACK_CLIENT_ID, SLACK_CLIENT_SECRET, SLACK_REDIRECT_URI                                               |

WEBHOOK_PUBLIC_BASE_URL is used to show the Grafana webhook URL in the dashboard. Grafana and
Twilio need an HTTPS URL that can reach the API. The deployed application uses permanent custom
domains, so production webhooks and OAuth callbacks do not depend on a temporary tunnel:

    WEB_URL=https://your-web-domain.example
    API_URL=https://your-api-domain.example
    WEBHOOK_PUBLIC_BASE_URL=https://your-api-domain.example
    TWILIO_WEBHOOK_BASE_URL=https://your-api-domain.example
    SLACK_REDIRECT_URI=https://your-web-domain.example/api/integrations/slack/callback

AUTH_TRUST_HOST should be true in the deployed Vercel environment. Use the Supabase transaction
pooler URL for the Vercel DATABASE_URL so serverless requests do not exhaust session-mode clients.
Local development still uses the localhost values from .env.example.

## Grafana setup

Grafana is the only monitoring system directly integrated with WakeOps.

1. Sign in to WakeOps and create or select an organization.
2. Open Integrations and open the Grafana connection card.
3. Generate WakeOps credentials and copy the secret. WakeOps stores only a hash, so the secret is not shown again.
4. Copy the organization webhook URL shown on the same page.
5. In Grafana, create a Webhook contact point.
6. Set the method to POST.
7. Set the authentication scheme to Bearer.
8. Paste the WakeOps secret into the credentials field.
9. Save the contact point and send a controlled notification with labels matching a saved WakeOps deployment.
10. Confirm that the incident appears in Overview and Incidents.

For a custom test or production alert, use labels that match the saved deployment:

    alertname=CheckoutHigh5xx
    service=checkout-api
    environment=production
    instance=i-0f3a92c7b81e46d20
    severity=critical

The instance value is not invented by WakeOps. It comes from Grafana alert labels. In a real
environment it may be an EC2 instance ID, VM name, container host, or another identifier that your
monitoring labels already contain.

WakeOps needs service, environment, and instance to map an alert to one saved service deployment.
Unknown or ambiguous labels are recorded as mapping failures instead of being guessed.

## Incident workflow

1. A firing Grafana webhook is verified and normalized.
2. WakeOps calculates an incident fingerprint from the organization, alert, service, environment,
   resource, and stable labels.
3. A repeated delivery attaches to the existing active incident instead of starting another call flow.
4. A new incident starts a Temporal workflow with ID incident-{incidentId}.
5. The workflow creates the on-call call attempt and publishes notification events.
6. A no-answer, busy, failed, or canceled on-call call waits 15 seconds after the 45-second result
   window, then tries the on-call engineer one more time.
7. If both on-call attempts fail, the workflow calls the configured senior engineer, up to two attempts.
8. An answered and completed call is treated as acknowledgement for this version and stops escalation.
9. A later Grafana recovery event updates the incident to RESOLVED. Acknowledged and resolved are separate states.

Technical retries handle temporary API or database failures. Business retries are the deliberate
rules for an engineer who did not answer.

## Notifications

Voice, email, and Slack are independent paths. A slow email provider does not hold the phone call.

For email, configure Resend and set EMAIL_FROM to a verified sender, such as:
WakeOps <noreply@alerts.example.com>

For Slack, configure OAuth, connect a workspace in Integrations, select a channel, and invite the
WakeOps app to private channels before testing. Slack is optional for an organization.

RabbitMQ is used only for notification fan-out. The incident lifecycle remains owned by Temporal and PostgreSQL.

## Twilio setup

1. Add the Twilio Account SID, Auth Token, and Twilio phone number.
2. Set TWILIO_WEBHOOK_BASE_URL to the public API URL.
3. In a Twilio trial account, verify the engineer destination number first.
4. Set TWILIO_TRIAL_MODE=true while using trial behavior.
5. Trigger one controlled mapped Grafana alert.
6. Confirm the call plays the deterministic incident message and that the Call SID appears on the incident page.

The API exposes Twilio voice and status callback routes. Twilio calls the API for TwiML instructions,
and the API records forward-only call status changes. The current product does not stream or transcribe
the call.

## Deployment notes

The current deployed arrangement is:

- Vercel hosts the Next.js web app behind its configured permanent web domain.
- Render hosts the Express API behind its configured permanent API domain.
- Supabase provides PostgreSQL. Vercel uses its transaction pooler connection.
- Temporal Cloud stores workflow history, timers, and task queues.
- CloudAMQP provides the RabbitMQ-compatible notification broker.
- The worker currently runs as an independent local process with npm run dev -w @wakeops/workers.
  It connects outbound to Temporal Cloud, Supabase, CloudAMQP, and Twilio, so it does not need a
  public URL or tunnel.
- UptimeRobot monitors GET /health on the API domain.
- Redis is optional and remains reserved for future cache or rate-limiting work.

For production reliability, move the worker from the local machine to an always-on background
service. Keep it separate from the API process so workflow polling and notification consumers do
not compete with webhook and callback traffic. The permanent web and API domains should remain the
configured Google OAuth, Slack OAuth, Grafana webhook, and Twilio callback origins.

## Current limitations

- Grafana is the only direct monitoring integration.
- One Grafana integration is supported per organization.
- A service deployment must be mapped before its alert can create a fully assigned incident.
- Calls use a fixed incident message and do not provide an interactive conversation.
- A completed answered call means acknowledgement for the current workflow. It does not prove the incident is fixed.
- Trial Twilio accounts may restrict destination numbers and callback behavior.
- The current worker depends on the local machine remaining online. If it stops, Temporal retains
  workflow state, but calls and queued notification work will not progress until a worker reconnects.
- Free-tier API instances can cold start or restart and are not suitable for strict production availability.
