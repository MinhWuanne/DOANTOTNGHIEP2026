-- AlterTable
ALTER TABLE `withdrawal_requests` ADD COLUMN `bankAccountId` BIGINT NULL;

-- CreateIndex
CREATE INDEX `withdrawal_requests_bankAccountId_idx` ON `withdrawal_requests`(`bankAccountId`);

-- AddForeignKey
ALTER TABLE `withdrawal_requests` ADD CONSTRAINT `withdrawal_requests_bankAccountId_fkey` FOREIGN KEY (`bankAccountId`) REFERENCES `bank_accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
