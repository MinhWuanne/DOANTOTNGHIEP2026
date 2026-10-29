-- CreateTable
CREATE TABLE `admin_accounts` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(100) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `role` ENUM('SUPER_ADMIN', 'ADMIN') NOT NULL DEFAULT 'ADMIN',
    `status` ENUM('ACTIVE', 'DISABLED') NOT NULL DEFAULT 'ACTIVE',
    `createdById` BIGINT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `admin_accounts_username_key`(`username`),
    UNIQUE INDEX `admin_accounts_email_key`(`email`),
    INDEX `admin_accounts_role_idx`(`role`),
    INDEX `admin_accounts_status_idx`(`status`),
    INDEX `admin_accounts_createdById_idx`(`createdById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `admin_accounts` ADD CONSTRAINT `admin_accounts_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `admin_accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
