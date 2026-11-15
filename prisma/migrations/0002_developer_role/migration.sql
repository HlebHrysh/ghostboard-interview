-- Add RBAC role column safely with default 'user' and normalize any legacy null/job-title values
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'user';
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'user';
UPDATE "User" SET "role" = 'user' WHERE "role" IS NULL OR "role" NOT IN ('user', 'developer', 'admin');
ALTER TABLE "User" ALTER COLUMN "role" SET NOT NULL;
