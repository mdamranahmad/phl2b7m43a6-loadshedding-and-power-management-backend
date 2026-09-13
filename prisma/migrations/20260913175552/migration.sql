/*
  Warnings:

  - You are about to drop the column `merchandInvoiceNumber` on the `Payment` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[merchantInvoiceNumber]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `merchantInvoiceNumber` to the `Payment` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Payment_merchandInvoiceNumber_key";

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "merchandInvoiceNumber",
ADD COLUMN     "merchantInvoiceNumber" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Payment_merchantInvoiceNumber_key" ON "Payment"("merchantInvoiceNumber");
