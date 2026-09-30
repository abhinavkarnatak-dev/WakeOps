ALTER TABLE "MonitoredResource"
DROP CONSTRAINT "MonitoredResource_organizationId_hostPrimaryEngineerId_fkey",
DROP CONSTRAINT "MonitoredResource_organizationId_hostSecondaryEngineerId_fkey";

ALTER TABLE "MonitoredResource"
DROP COLUMN "hostPrimaryEngineerId",
DROP COLUMN "hostSecondaryEngineerId";
