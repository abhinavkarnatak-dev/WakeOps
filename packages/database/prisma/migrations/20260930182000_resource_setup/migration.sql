CREATE TYPE "MonitoringSource" AS ENUM ('ALERTMANAGER', 'GRAFANA', 'CLOUDWATCH');

CREATE TABLE "Engineer" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Engineer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Environment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Environment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MonitoredResource" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "source" "MonitoringSource" NOT NULL,
    "externalIdentifier" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonitoredResource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ResourceMapping" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "environmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourceMapping_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OnCallAssignment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "mappingId" TEXT NOT NULL,
    "primaryEngineerId" TEXT NOT NULL,
    "secondaryEngineerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnCallAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Engineer_organizationId_id_key" ON "Engineer"("organizationId", "id");

CREATE UNIQUE INDEX "Engineer_organizationId_email_key" ON "Engineer"("organizationId", "email");

CREATE UNIQUE INDEX "Application_organizationId_id_key" ON "Application"("organizationId", "id");

CREATE UNIQUE INDEX "Application_organizationId_name_key" ON "Application"("organizationId", "name");

CREATE UNIQUE INDEX "Environment_organizationId_id_key" ON "Environment"("organizationId", "id");

CREATE UNIQUE INDEX "Environment_organizationId_name_key" ON "Environment"("organizationId", "name");

CREATE UNIQUE INDEX "MonitoredResource_organizationId_id_key" ON "MonitoredResource"("organizationId", "id");

CREATE UNIQUE INDEX "MonitoredResource_organizationId_source_externalIdentifier_key" ON "MonitoredResource"("organizationId", "source", "externalIdentifier");

CREATE UNIQUE INDEX "ResourceMapping_resourceId_key" ON "ResourceMapping"("resourceId");

CREATE UNIQUE INDEX "ResourceMapping_organizationId_id_key" ON "ResourceMapping"("organizationId", "id");

CREATE UNIQUE INDEX "ResourceMapping_organizationId_resourceId_key" ON "ResourceMapping"("organizationId", "resourceId");

CREATE UNIQUE INDEX "OnCallAssignment_mappingId_key" ON "OnCallAssignment"("mappingId");

CREATE UNIQUE INDEX "OnCallAssignment_organizationId_mappingId_key" ON "OnCallAssignment"("organizationId", "mappingId");

ALTER TABLE "Engineer" ADD CONSTRAINT "Engineer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Application" ADD CONSTRAINT "Application_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Environment" ADD CONSTRAINT "Environment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MonitoredResource" ADD CONSTRAINT "MonitoredResource_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ResourceMapping" ADD CONSTRAINT "ResourceMapping_organizationId_resourceId_fkey" FOREIGN KEY ("organizationId", "resourceId") REFERENCES "MonitoredResource"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ResourceMapping" ADD CONSTRAINT "ResourceMapping_organizationId_applicationId_fkey" FOREIGN KEY ("organizationId", "applicationId") REFERENCES "Application"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ResourceMapping" ADD CONSTRAINT "ResourceMapping_organizationId_environmentId_fkey" FOREIGN KEY ("organizationId", "environmentId") REFERENCES "Environment"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OnCallAssignment" ADD CONSTRAINT "OnCallAssignment_organizationId_mappingId_fkey" FOREIGN KEY ("organizationId", "mappingId") REFERENCES "ResourceMapping"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OnCallAssignment" ADD CONSTRAINT "OnCallAssignment_organizationId_primaryEngineerId_fkey" FOREIGN KEY ("organizationId", "primaryEngineerId") REFERENCES "Engineer"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OnCallAssignment" ADD CONSTRAINT "OnCallAssignment_organizationId_secondaryEngineerId_fkey" FOREIGN KEY ("organizationId", "secondaryEngineerId") REFERENCES "Engineer"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
