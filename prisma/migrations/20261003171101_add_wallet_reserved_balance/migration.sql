-- AlterTable
ALTER TABLE `wallets` ADD COLUMN `reservedBalance` DECIMAL(15, 2) NOT NULL DEFAULT 0.00;
