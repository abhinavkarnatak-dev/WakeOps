DROP INDEX "ResourceMapping_resourceId_key";
DROP INDEX "ResourceMapping_organizationId_resourceId_key";

ALTER TABLE "MonitoredResource"
ADD COLUMN "hostPrimaryEngineerId" TEXT,
ADD COLUMN "hostSecondaryEngineerId" TEXT;

CREATE UNIQUE INDEX "ResourceMapping_organizationId_resourceId_applicationId_environmentId_key"
ON "ResourceMapping"("organizationId", "resourceId", "applicationId", "environmentId");

ALTER TABLE "MonitoredResource"
ADD CONSTRAINT "MonitoredResource_organizationId_hostPrimaryEngineerId_fkey"
FOREIGN KEY ("organizationId", "hostPrimaryEngineerId")
REFERENCES "Engineer"("organizationId", "id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MonitoredResource"
ADD CONSTRAINT "MonitoredResource_organizationId_hostSecondaryEngineerId_fkey"
FOREIGN KEY ("organizationId", "hostSecondaryEngineerId")
REFERENCES "Engineer"("organizationId", "id")
ON DELETE RESTRICT ON UPDATE CASCADE;
