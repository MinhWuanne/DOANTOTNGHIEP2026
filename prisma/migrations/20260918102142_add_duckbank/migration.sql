-- CreateTable
CREATE TABLE `bank_accounts` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `accountNumber` VARCHAR(50) NOT NULL,
    `ownerAccountId` BIGINT NULL,
    `ownerType` ENUM('USER', 'SHOP') NOT NULL,
    `balance` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `status` ENUM('ACTIVE', 'LOCKED') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `bank_accounts_accountNumber_key`(`accountNumber`),
    UNIQUE INDEX `bank_accounts_ownerAccountId_key`(`ownerAccountId`),
    INDEX `bank_accounts_ownerType_idx`(`ownerType`),
    INDEX `bank_accounts_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bank_transactions` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `fromBankAccountId` BIGINT NULL,
    `toBankAccountId` BIGINT NULL,
    `type` ENUM('DEPOSIT', 'WITHDRAWAL', 'TRANSFER') NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `description` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `bank_transactions_fromBankAccountId_idx`(`fromBankAccountId`),
    INDEX `bank_transactions_toBankAccountId_idx`(`toBankAccountId`),
    INDEX `bank_transactions_type_idx`(`type`),
    INDEX `bank_transactions_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `bank_transactions` ADD CONSTRAINT `bank_transactions_fromBankAccountId_fkey` FOREIGN KEY (`fromBankAccountId`) REFERENCES `bank_accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bank_transactions` ADD CONSTRAINT `bank_transactions_toBankAccountId_fkey` FOREIGN KEY (`toBankAccountId`) REFERENCES `bank_accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
