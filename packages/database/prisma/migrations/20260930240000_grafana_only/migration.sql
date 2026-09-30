UPDATE "MonitoredResource"
SET "source" = 'GRAFANA'
WHERE "source" <> 'GRAFANA';

ALTER TYPE "MonitoringSource" RENAME TO "MonitoringSource_old";
CREATE TYPE "MonitoringSource" AS ENUM ('GRAFANA');

ALTER TABLE "MonitoredResource"
ALTER COLUMN "source" TYPE "MonitoringSource"
USING "source"::text::"MonitoringSource";

ALTER TABLE "MonitoringWebhookTest"
ALTER COLUMN "source" TYPE "MonitoringSource"
USING "source"::text::"MonitoringSource";

DROP TYPE "MonitoringSource_old";
