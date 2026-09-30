CREATE TABLE "GrafanaIntegration" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "secretHash" TEXT NOT NULL,
    "secretHint" TEXT NOT NULL,
    "lastVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrafanaIntegration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GrafanaIntegration_organizationId_key" ON "GrafanaIntegration"("organizationId");

ALTER TABLE "GrafanaIntegration" ADD CONSTRAINT "GrafanaIntegration_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
