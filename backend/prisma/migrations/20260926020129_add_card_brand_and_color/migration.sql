-- CreateEnum
CREATE TYPE "CardBrand" AS ENUM ('VISA', 'MASTERCARD', 'ELO', 'AMEX', 'HIPERCARD', 'OTHER');

-- AlterTable
ALTER TABLE "cards" ADD COLUMN     "brand" "CardBrand" NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "color" VARCHAR(7);
