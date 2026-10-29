-- CreateTable
CREATE TABLE `complaints` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `ticketCode` VARCHAR(30) NOT NULL,
    `accountId` BIGINT NOT NULL,
    `category` ENUM('ORDER', 'PAYMENT', 'RETURN', 'WALLET', 'COMMISSION', 'WITHDRAWAL', 'ACCOUNT', 'FEEDBACK', 'REF', 'OTHER') NOT NULL,
    `subject` VARCHAR(200) NOT NULL,
    `status` ENUM('PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `resolutionReason` TEXT NULL,
    `firstResponseAt` DATETIME(3) NULL,
    `lastMemberMessageAt` DATETIME(3) NULL,
    `lastAdminReplyAt` DATETIME(3) NULL,
    `responseDueAt` DATETIME(3) NULL,
    `responsePending` BOOLEAN NOT NULL DEFAULT true,
    `closedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `complaints_ticketCode_key`(`ticketCode`),
    INDEX `complaints_accountId_createdAt_idx`(`accountId`, `createdAt`),
    INDEX `complaints_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `complaints_category_createdAt_idx`(`category`, `createdAt`),
    INDEX `complaints_responsePending_responseDueAt_idx`(`responsePending`, `responseDueAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `complaint_messages` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `complaintId` BIGINT NOT NULL,
    `senderType` ENUM('ACCOUNT', 'ADMIN') NOT NULL,
    `senderAccountId` BIGINT NULL,
    `senderAdminId` BIGINT NULL,
    `messageType` ENUM('MESSAGE', 'INTERNAL_NOTE') NOT NULL DEFAULT 'MESSAGE',
    `content` TEXT NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `deletedByAdminId` BIGINT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `complaint_messages_complaintId_createdAt_idx`(`complaintId`, `createdAt`),
    INDEX `complaint_messages_senderAccountId_idx`(`senderAccountId`),
    INDEX `complaint_messages_senderAdminId_idx`(`senderAdminId`),
    INDEX `complaint_messages_messageType_createdAt_idx`(`messageType`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `complaint_attachments` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `messageId` BIGINT NOT NULL,
    `originalName` VARCHAR(255) NOT NULL,
    `storageKey` VARCHAR(100) NOT NULL,
    `mimeType` VARCHAR(100) NOT NULL,
    `sizeBytes` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `complaint_attachments_storageKey_key`(`storageKey`),
    INDEX `complaint_attachments_messageId_idx`(`messageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `complaint_assignments` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `complaintId` BIGINT NOT NULL,
    `adminId` BIGINT NOT NULL,
    `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `complaint_assignments_adminId_assignedAt_idx`(`adminId`, `assignedAt`),
    UNIQUE INDEX `complaint_assignments_complaintId_adminId_key`(`complaintId`, `adminId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `complaint_histories` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `complaintId` BIGINT NOT NULL,
    `actorType` ENUM('ACCOUNT', 'ADMIN') NOT NULL,
    `actorAccountId` BIGINT NULL,
    `actorAdminId` BIGINT NULL,
    `action` VARCHAR(50) NOT NULL,
    `oldValue` TEXT NULL,
    `newValue` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `complaint_histories_complaintId_createdAt_idx`(`complaintId`, `createdAt`),
    INDEX `complaint_histories_actorAccountId_idx`(`actorAccountId`),
    INDEX `complaint_histories_actorAdminId_idx`(`actorAdminId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `complaints` ADD CONSTRAINT `complaints_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `user_accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `complaint_messages` ADD CONSTRAINT `complaint_messages_complaintId_fkey` FOREIGN KEY (`complaintId`) REFERENCES `complaints`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `complaint_messages` ADD CONSTRAINT `complaint_messages_senderAccountId_fkey` FOREIGN KEY (`senderAccountId`) REFERENCES `user_accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `complaint_messages` ADD CONSTRAINT `complaint_messages_senderAdminId_fkey` FOREIGN KEY (`senderAdminId`) REFERENCES `admin_accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `complaint_messages` ADD CONSTRAINT `complaint_messages_deletedByAdminId_fkey` FOREIGN KEY (`deletedByAdminId`) REFERENCES `admin_accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `complaint_attachments` ADD CONSTRAINT `complaint_attachments_messageId_fkey` FOREIGN KEY (`messageId`) REFERENCES `complaint_messages`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `complaint_assignments` ADD CONSTRAINT `complaint_assignments_complaintId_fkey` FOREIGN KEY (`complaintId`) REFERENCES `complaints`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `complaint_assignments` ADD CONSTRAINT `complaint_assignments_adminId_fkey` FOREIGN KEY (`adminId`) REFERENCES `admin_accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `complaint_histories` ADD CONSTRAINT `complaint_histories_complaintId_fkey` FOREIGN KEY (`complaintId`) REFERENCES `complaints`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `complaint_histories` ADD CONSTRAINT `complaint_histories_actorAccountId_fkey` FOREIGN KEY (`actorAccountId`) REFERENCES `user_accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `complaint_histories` ADD CONSTRAINT `complaint_histories_actorAdminId_fkey` FOREIGN KEY (`actorAdminId`) REFERENCES `admin_accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

