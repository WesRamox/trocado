-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "split_of_id" INTEGER;

-- CreateIndex
CREATE INDEX "transactions_split_of_id_idx" ON "transactions"("split_of_id");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_split_of_id_fkey" FOREIGN KEY ("split_of_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
