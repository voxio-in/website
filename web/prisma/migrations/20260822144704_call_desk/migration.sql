/*
  Warnings:

  - You are about to drop the column `university` on the `CallRequest` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CallRequest" DROP COLUMN "university",
ADD COLUMN     "desk" TEXT NOT NULL DEFAULT 'university',
ADD COLUMN     "org" TEXT;
