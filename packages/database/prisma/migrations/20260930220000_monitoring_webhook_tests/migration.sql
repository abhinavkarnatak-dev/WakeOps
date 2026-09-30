CREATE TABLE "MonitoringWebhookTest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "source" "MonitoringSource" NOT NULL,
    "receiver" TEXT,
    "status" TEXT NOT NULL,
    "alertCount" INTEGER NOT NULL,
    "alertName" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonitoringWebhookTest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MonitoringWebhookTest_organizationId_source_receivedAt_idx"
ON "MonitoringWebhookTest"("organizationId", "source", "receivedAt");

ALTER TABLE "MonitoringWebhookTest"
ADD CONSTRAINT "MonitoringWebhookTest_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
