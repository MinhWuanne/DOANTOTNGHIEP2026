-- AlterTable
ALTER TABLE `orders` ADD COLUMN `commissionEligibleAt` DATETIME(3) NULL,
    ADD COLUMN `deliveredAt` DATETIME(3) NULL;
