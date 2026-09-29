-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "person_id" INTEGER,
ADD COLUMN     "reimbursed_at" DATE;

-- CreateTable
CREATE TABLE "people" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "color" VARCHAR(7),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "people_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "people_user_id_name_key" ON "people"("user_id", "name");

-- CreateIndex
CREATE INDEX "transactions_person_id_idx" ON "transactions"("person_id");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "people" ADD CONSTRAINT "people_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
