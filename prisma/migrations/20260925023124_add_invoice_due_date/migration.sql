-- DropIndex
DROP INDEX "transactions_card_id_idx";

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "invoice_due_date" DATE;

-- CreateIndex
CREATE INDEX "transactions_card_id_invoice_due_date_idx" ON "transactions"("card_id", "invoice_due_date");
