-- M2 added the unique index but not the NOT NULL constraint that
-- `claimCode String @unique` implies. Every tag has a code by now.
ALTER TABLE "Tag" ALTER COLUMN "claimCode" SET NOT NULL;
