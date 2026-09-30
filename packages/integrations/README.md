# Integrations

Provider-specific connection adapters for monitoring, GitHub, and Slack.

The first adapter validates Grafana's standard webhook payload and extracts a safe test summary.
Provider payloads stay here so the rest of WakeOps does not depend on Grafana's JSON structure.
