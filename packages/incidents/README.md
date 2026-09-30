# Incidents

Durable alert processing and incident state changes.

This package maps normalized alerts to configured resources, applications, environments and
engineers. It records mapping failures, prevents duplicate delivery processing, creates one active
incident per fingerprint, attaches changed repeat alerts, resolves incidents and writes audit events.
