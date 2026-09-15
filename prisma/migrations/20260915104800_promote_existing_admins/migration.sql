-- Every admin that existed before the split had full control, so they become
-- super admins and nobody loses access. A separate migration from the one that
-- added the enum value: Postgres refuses to use a new enum value inside the
-- transaction that created it.
UPDATE "User" SET "role" = 'SUPER_ADMIN' WHERE "role" = 'ADMIN';
