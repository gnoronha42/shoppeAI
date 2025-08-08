-- DropIndex
DROP INDEX "checklist_progress_client_id_item_id_key";

-- AlterTable
ALTER TABLE "checklist_progress" ADD COLUMN     "analyst_id" UUID,
ADD COLUMN     "analyst_name" VARCHAR(255),
ADD COLUMN     "execution_count" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "execution_history" JSONB NOT NULL DEFAULT '[]';

-- CreateIndex
CREATE INDEX "idx_checklist_progress_analyst_id" ON "checklist_progress"("analyst_id");

-- CreateIndex
CREATE INDEX "idx_checklist_progress_execution_count" ON "checklist_progress"("execution_count");

-- AddForeignKey
ALTER TABLE "checklist_progress" ADD CONSTRAINT "checklist_progress_analyst_id_fkey" FOREIGN KEY ("analyst_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
