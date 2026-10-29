/*
  Warnings:

  - You are about to drop the column `parentFranchiseId` on the `franchise_profiles` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `franchise_profiles` DROP FOREIGN KEY `franchise_profiles_parentFranchiseId_fkey`;

-- DropIndex
DROP INDEX `franchise_profiles_parentFranchiseId_idx` ON `franchise_profiles`;

-- AlterTable
ALTER TABLE `franchise_profiles` DROP COLUMN `parentFranchiseId`;
