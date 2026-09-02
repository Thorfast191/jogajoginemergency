-- Every Tag has a claim code after the backfill; enforce uniqueness.
CREATE UNIQUE INDEX "Tag_claimCode_key" ON "Tag"("claimCode");
