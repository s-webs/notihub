-- Keep each existing global type available in every existing project.
-- Remap routing rules before removing the original shared rows.
ALTER TABLE "notification_types" ADD COLUMN "client_id" TEXT;
DROP INDEX "notification_types_code_key";
ALTER TABLE "routing_rules" DROP CONSTRAINT "routing_rules_notification_type_id_fkey";

CREATE TEMP TABLE "project_type_map" AS
SELECT t."id" AS "old_id", c."id" AS "client_id", gen_random_uuid()::text AS "new_id"
FROM "notification_types" t CROSS JOIN "clients" c;

INSERT INTO "notification_types" ("id", "client_id", "code", "name", "created_at", "updated_at")
SELECT m."new_id", m."client_id", t."code", t."name", t."created_at", t."updated_at"
FROM "project_type_map" m JOIN "notification_types" t ON t."id" = m."old_id";

UPDATE "routing_rules" r
SET "notification_type_id" = m."new_id"
FROM "project_type_map" m
WHERE r."notification_type_id" = m."old_id" AND r."client_id" = m."client_id";

DELETE FROM "notification_types" WHERE "client_id" IS NULL;
ALTER TABLE "notification_types" ALTER COLUMN "client_id" SET NOT NULL;

CREATE UNIQUE INDEX "notification_types_client_id_code_key" ON "notification_types"("client_id", "code");
CREATE UNIQUE INDEX "notification_types_client_id_id_key" ON "notification_types"("client_id", "id");
ALTER TABLE "notification_types" ADD CONSTRAINT "notification_types_client_id_fkey"
  FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "routing_rules" ADD CONSTRAINT "routing_rules_client_id_notification_type_id_fkey"
  FOREIGN KEY ("client_id", "notification_type_id") REFERENCES "notification_types"("client_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
