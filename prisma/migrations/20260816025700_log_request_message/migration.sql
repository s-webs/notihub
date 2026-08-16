-- AlterTable
ALTER TABLE "notification_logs" ADD COLUMN "request" JSONB;
ALTER TABLE "notification_logs" ADD COLUMN "message" TEXT;
