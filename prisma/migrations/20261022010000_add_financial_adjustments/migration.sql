-- AlterTable
ALTER TABLE `wallet_transactions` MODIFY `type` ENUM('TOP_UP', 'COMMISSION', 'ORDER_PAYMENT', 'WITHDRAWAL', 'REFUND', 'ADJUSTMENT') NOT NULL;

-- CreateTable
CREATE TABLE `financial_adjustments` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `ticketCode` VARCHAR(64) NOT NULL,
    `recipientAccountId` BIGINT NOT NULL,
    `createdByAdminId` BIGINT NOT NULL,
    `confirmedByAdminId` BIGINT NULL,
    `walletTransactionId` BIGINT NULL,
    `direction` ENUM('CREDIT', 'DEBIT') NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `reason` ENUM('LATE_BANK_TRANSFER', 'MEMBER_COMPLAINT', 'FRANCHISE_COMPLAINT', 'COMPENSATION', 'TRANSACTION_CORRECTION', 'OTHER') NOT NULL,
    `note` VARCHAR(500) NULL,
    `status` ENUM('PENDING', 'COMPLETED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    `expiresAt` DATETIME(3) NOT NULL,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `financial_adjustments_ticketCode_key`(`ticketCode`),
    UNIQUE INDEX `financial_adjustments_walletTransactionId_key`(`walletTransactionId`),
    INDEX `financial_adjustments_recipientAccountId_createdAt_idx`(`recipientAccountId`, `createdAt`),
    INDEX `financial_adjustments_createdByAdminId_createdAt_idx`(`createdByAdminId`, `createdAt`),
    INDEX `financial_adjustments_confirmedByAdminId_idx`(`confirmedByAdminId`),
    INDEX `financial_adjustments_status_expiresAt_idx`(`status`, `expiresAt`),
    INDEX `financial_adjustments_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `financial_adjustments` ADD CONSTRAINT `financial_adjustments_recipientAccountId_fkey` FOREIGN KEY (`recipientAccountId`) REFERENCES `user_accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `financial_adjustments` ADD CONSTRAINT `financial_adjustments_createdByAdminId_fkey` FOREIGN KEY (`createdByAdminId`) REFERENCES `admin_accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `financial_adjustments` ADD CONSTRAINT `financial_adjustments_confirmedByAdminId_fkey` FOREIGN KEY (`confirmedByAdminId`) REFERENCES `admin_accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `financial_adjustments` ADD CONSTRAINT `financial_adjustments_walletTransactionId_fkey` FOREIGN KEY (`walletTransactionId`) REFERENCES `wallet_transactions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
