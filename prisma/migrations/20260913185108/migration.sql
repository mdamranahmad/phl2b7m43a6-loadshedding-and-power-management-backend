/*
  Warnings:

  - You are about to drop the column `userId` on the `tokens` table. All the data in the column will be lost.
  - Added the required column `CustomerId` to the `tokens` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "tokens" DROP CONSTRAINT "tokens_userId_fkey";

-- AlterTable
ALTER TABLE "tokens" DROP COLUMN "userId",
ADD COLUMN     "CustomerId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "tokens" ADD CONSTRAINT "tokens_CustomerId_fkey" FOREIGN KEY ("CustomerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
