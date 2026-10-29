-- AlterTable
ALTER TABLE `bank_transactions` ADD COLUMN `paymentInstructionId` BIGINT NULL;

-- CreateTable
CREATE TABLE `payment_instructions` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `accountId` BIGINT NOT NULL,
    `orderId` BIGINT NULL,
    `bankAccountId` BIGINT NOT NULL,
    `type` ENUM('ORDER_PAYMENT', 'WALLET_TOP_UP') NOT NULL,
    `status` ENUM('WAITING', 'PARTIALLY_PAID', 'COMPLETED', 'OVERPAID', 'MANUAL_APPROVED', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'WAITING',
    `expectedAmount` DECIMAL(15, 2) NOT NULL,
    `receivedAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `transferContent` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NOT NULL,
    `completedAt` DATETIME(3) NULL,
    `processedByAdminId` BIGINT NULL,
    `adminNote` VARCHAR(500) NULL,

    INDEX `payment_instructions_accountId_idx`(`accountId`),
    INDEX `payment_instructions_orderId_idx`(`orderId`),
    INDEX `payment_instructions_bankAccountId_idx`(`bankAccountId`),
    INDEX `payment_instructions_status_idx`(`status`),
    INDEX `payment_instructions_expiresAt_idx`(`expiresAt`),
    INDEX `payment_instructions_processedByAdminId_idx`(`processedByAdminId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `bank_transactions_paymentInstructionId_idx` ON `bank_transactions`(`paymentInstructionId`);

-- AddForeignKey
ALTER TABLE `bank_transactions` ADD CONSTRAINT `bank_transactions_paymentInstructionId_fkey` FOREIGN KEY (`paymentInstructionId`) REFERENCES `payment_instructions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_instructions` ADD CONSTRAINT `payment_instructions_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `user_accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_instructions` ADD CONSTRAINT `payment_instructions_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_instructions` ADD CONSTRAINT `payment_instructions_bankAccountId_fkey` FOREIGN KEY (`bankAccountId`) REFERENCES `bank_accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_instructions` ADD CONSTRAINT `payment_instructions_processedByAdminId_fkey` FOREIGN KEY (`processedByAdminId`) REFERENCES `admin_accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
