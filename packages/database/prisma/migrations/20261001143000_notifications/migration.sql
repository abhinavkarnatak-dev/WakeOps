CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'SLACK');
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

ALTER TYPE "AuditEventType" ADD VALUE 'NOTIFICATION_REQUESTED';
ALTER TYPE "AuditEventType" ADD VALUE 'NOTIFICATION_STATUS_UPDATED';

CREATE TABLE "NotificationAttempt" (
  "id" TEXT NOT NULL,
  "incidentId" TEXT NOT NULL,
  "channel" "NotificationChannel" NOT NULL,
  "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
  "destination" TEXT NOT NULL,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "providerMessageId" TEXT,
  "failureMessage" TEXT,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationAttempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SlackInstallation" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "teamName" TEXT NOT NULL,
  "botUserId" TEXT,
  "accessTokenEncrypted" TEXT NOT NULL,
  "scopes" TEXT NOT NULL,
  "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SlackInstallation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SlackDestination" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "installationId" TEXT NOT NULL,
  "channelId" TEXT NOT NULL,
  "channelName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SlackDestination_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OAuthConnectionState" (
  "stateHash" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OAuthConnectionState_pkey" PRIMARY KEY ("stateHash")
);

CREATE UNIQUE INDEX "NotificationAttempt_incidentId_channel_key" ON "NotificationAttempt"("incidentId", "channel");
CREATE INDEX "NotificationAttempt_status_createdAt_idx" ON "NotificationAttempt"("status", "createdAt");
CREATE UNIQUE INDEX "SlackInstallation_organizationId_key" ON "SlackInstallation"("organizationId");
CREATE INDEX "SlackInstallation_teamId_idx" ON "SlackInstallation"("teamId");
CREATE UNIQUE INDEX "SlackDestination_organizationId_key" ON "SlackDestination"("organizationId");
CREATE UNIQUE INDEX "SlackDestination_installationId_channelId_key" ON "SlackDestination"("installationId", "channelId");
CREATE INDEX "OAuthConnectionState_expiresAt_idx" ON "OAuthConnectionState"("expiresAt");

ALTER TABLE "NotificationAttempt" ADD CONSTRAINT "NotificationAttempt_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SlackInstallation" ADD CONSTRAINT "SlackInstallation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SlackDestination" ADD CONSTRAINT "SlackDestination_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SlackDestination" ADD CONSTRAINT "SlackDestination_installationId_fkey" FOREIGN KEY ("installationId") REFERENCES "SlackInstallation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OAuthConnectionState" ADD CONSTRAINT "OAuthConnectionState_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OAuthConnectionState" ADD CONSTRAINT "OAuthConnectionState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
