-- Campaign negotiation: per-creator deliverables + append-only terms history.

ALTER TABLE "campaign_creators" ADD COLUMN "deliverables" TEXT;

CREATE TABLE "negotiation_history" (
    "id" TEXT NOT NULL,
    "campaignCreatorId" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "deliverables" TEXT,
    "changedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "negotiation_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "negotiation_history_campaignCreatorId_idx" ON "negotiation_history"("campaignCreatorId");
CREATE INDEX "negotiation_history_changedById_idx" ON "negotiation_history"("changedById");

ALTER TABLE "negotiation_history" ADD CONSTRAINT "negotiation_history_campaignCreatorId_fkey"
    FOREIGN KEY ("campaignCreatorId") REFERENCES "campaign_creators"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "negotiation_history" ADD CONSTRAINT "negotiation_history_changedById_fkey"
    FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
