ALTER TYPE "AuditEventType" ADD VALUE 'CALL_REQUESTED';
ALTER TYPE "AuditEventType" ADD VALUE 'CALL_STATUS_UPDATED';

CREATE TYPE "CallAttemptStatus" AS ENUM ('CREATED', 'QUEUED', 'RINGING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'NO_ANSWER', 'BUSY', 'CANCELED');

CREATE TABLE "CallAttempt" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "engineerId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "status" "CallAttemptStatus" NOT NULL DEFAULT 'CREATED',
    "providerCallId" TEXT,
    "submissionStartedAt" TIMESTAMP(3),
    "initiatedAt" TIMESTAMP(3),
    "answeredAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failureCode" TEXT,
    "failureMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CallAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CallAttempt_providerCallId_key" ON "CallAttempt"("providerCallId");
CREATE UNIQUE INDEX "CallAttempt_incidentId_engineerId_attemptNumber_key" ON "CallAttempt"("incidentId", "engineerId", "attemptNumber");
CREATE INDEX "CallAttempt_incidentId_createdAt_idx" ON "CallAttempt"("incidentId", "createdAt");
CREATE INDEX "CallAttempt_engineerId_createdAt_idx" ON "CallAttempt"("engineerId", "createdAt");

ALTER TABLE "CallAttempt" ADD CONSTRAINT "CallAttempt_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CallAttempt" ADD CONSTRAINT "CallAttempt_engineerId_fkey" FOREIGN KEY ("engineerId") REFERENCES "Engineer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
