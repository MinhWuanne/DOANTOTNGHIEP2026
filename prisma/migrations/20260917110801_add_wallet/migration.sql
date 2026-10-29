-- CreateTable
CREATE TABLE `wallets` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `accountId` BIGINT NOT NULL,
    `balance` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `wallets_accountId_key`(`accountId`),
    INDEX `wallets_accountId_idx`(`accountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wallet_transactions` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `walletId` BIGINT NOT NULL,
    `type` ENUM('TOP_UP', 'COMMISSION', 'ORDER_PAYMENT', 'WITHDRAWAL') NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `balanceBefore` DECIMAL(15, 2) NOT NULL,
    `balanceAfter` DECIMAL(15, 2) NOT NULL,
    `description` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `wallet_transactions_walletId_idx`(`walletId`),
    INDEX `wallet_transactions_type_idx`(`type`),
    INDEX `wallet_transactions_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `withdrawal_requests` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `walletId` BIGINT NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED') NOT NULL DEFAULT 'PENDING',
    `note` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `withdrawal_requests_walletId_idx`(`walletId`),
    INDEX `withdrawal_requests_status_idx`(`status`),
    INDEX `withdrawal_requests_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `wallets` ADD CONSTRAINT `wallets_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `user_accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wallet_transactions` ADD CONSTRAINT `wallet_transactions_walletId_fkey` FOREIGN KEY (`walletId`) REFERENCES `wallets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `withdrawal_requests` ADD CONSTRAINT `withdrawal_requests_walletId_fkey` FOREIGN KEY (`walletId`) REFERENCES `wallets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
