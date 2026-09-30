CREATE TYPE "AlertSeverity" AS ENUM ('CRITICAL', 'WARNING', 'INFO');
CREATE TYPE "AlertLifecycleStatus" AS ENUM ('FIRING', 'RESOLVED');
CREATE TYPE "AlertProcessingStatus" AS ENUM ('PROCESSED', 'DEDUPLICATED', 'MAPPING_FAILED', 'UNMATCHED_RESOLUTION');
CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'NOTIFYING', 'ACKNOWLEDGED', 'RESOLVED');
CREATE TYPE "AuditEventType" AS ENUM ('ALERT_RECEIVED', 'INCIDENT_CREATED', 'ALERT_DEDUPLICATED', 'INCIDENT_RESOLVED');

CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "environmentId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "source" "MonitoringSource" NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "activeFingerprint" TEXT,
    "alertName" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "value" TEXT,
    "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "labels" JSONB NOT NULL,
    "annotations" JSONB NOT NULL,
    "metadata" JSONB NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AlertEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "incidentId" TEXT,
    "source" "MonitoringSource" NOT NULL,
    "eventKey" TEXT NOT NULL,
    "externalEventId" TEXT,
    "lifecycleStatus" "AlertLifecycleStatus" NOT NULL,
    "processingStatus" "AlertProcessingStatus" NOT NULL,
    "mappingError" TEXT,
    "alertName" TEXT,
    "resourceIdentifier" TEXT,
    "service" TEXT,
    "environment" TEXT,
    "severity" TEXT,
    "value" TEXT,
    "labels" JSONB NOT NULL,
    "annotations" JSONB NOT NULL,
    "metadata" JSONB NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlertEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "type" "AuditEventType" NOT NULL,
    "details" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Incident_organizationId_activeFingerprint_key" ON "Incident"("organizationId", "activeFingerprint");
CREATE INDEX "Incident_organizationId_status_createdAt_idx" ON "Incident"("organizationId", "status", "createdAt");
CREATE INDEX "Incident_organizationId_fingerprint_createdAt_idx" ON "Incident"("organizationId", "fingerprint", "createdAt");
CREATE UNIQUE INDEX "AlertEvent_organizationId_eventKey_key" ON "AlertEvent"("organizationId", "eventKey");
CREATE INDEX "AlertEvent_organizationId_receivedAt_idx" ON "AlertEvent"("organizationId", "receivedAt");
CREATE INDEX "AlertEvent_incidentId_receivedAt_idx" ON "AlertEvent"("incidentId", "receivedAt");
CREATE INDEX "AuditEvent_incidentId_occurredAt_idx" ON "AuditEvent"("incidentId", "occurredAt");

ALTER TABLE "Incident" ADD CONSTRAINT "Incident_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_organizationId_applicationId_fkey" FOREIGN KEY ("organizationId", "applicationId") REFERENCES "Application"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_organizationId_environmentId_fkey" FOREIGN KEY ("organizationId", "environmentId") REFERENCES "Environment"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_organizationId_resourceId_fkey" FOREIGN KEY ("organizationId", "resourceId") REFERENCES "MonitoredResource"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AlertEvent" ADD CONSTRAINT "AlertEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AlertEvent" ADD CONSTRAINT "AlertEvent_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;
