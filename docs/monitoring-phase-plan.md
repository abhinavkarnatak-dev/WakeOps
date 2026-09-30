# Grafana monitoring phase plan

WakeOps supports Grafana as its monitoring webhook provider. This keeps the project focused while
still allowing Grafana to visualize and alert on many data sources. A company may connect Prometheus,
CloudWatch, or another metrics source to Grafana, but WakeOps only needs to understand Grafana's
webhook format.

## The identity we need

A service-specific alert should provide these labels:

- `alertname`: the rule or problem name;
- `service`: the WakeOps application name;
- `environment`: the WakeOps environment name;
- `instance`: the host or resource identifier;
- `severity`: the incident severity.

Useful annotations include `summary`, `description`, and `runbook_url`. Labels are used for reliable
matching. Annotations are human-readable context and must not be used as trusted identifiers.

## Checkpoints

### 1. Test the contact point

Create a Grafana Webhook contact point, configure Bearer authentication, and send the predefined
test. WakeOps should show a green connection result.

### 2. Inspect a custom test payload

Use Grafana's custom test option to send the proposed labels. WakeOps shows an allowlisted preview of
the labels and annotations it received. We verify the real field names before enforcing them.

### 3. Normalize the alert - complete

Convert the Grafana payload into WakeOps' provider-neutral incident alert type. Validate important
fields and give a clear error when required labels are absent.

### 4. Map the alert - complete

Match `instance`, `service`, and `environment` to the host and service deployment configured in
WakeOps. Unknown or ambiguous mappings must be visible and must never be guessed.

### 5. Create one controlled alert rule - ready for manual test

Create a safe Grafana test rule, attach the contact point, and watch it move from normal to firing.
Confirm that WakeOps receives both firing and resolved notifications.

### 6. Add dedupe and incident creation - complete

Calculate a stable fingerprint, store every alert event, and create only one active incident for
duplicate deliveries of the same problem.

## Scope boundary

WakeOps does not implement separate Prometheus Alertmanager or AWS CloudWatch webhook adapters. Those
systems may still supply data to Grafana. Internal WakeOps observability may later use Prometheus-style
metrics, which is separate from customer monitoring integrations.
