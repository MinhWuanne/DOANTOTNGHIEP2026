-- CreateTable
CREATE TABLE `inventory_receipts` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `receiptNumber` VARCHAR(50) NOT NULL,
    `status` ENUM('DRAFT', 'CONFIRMED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `note` VARCHAR(500) NULL,
    `createdById` BIGINT NOT NULL,
    `confirmedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `inventory_receipts_receiptNumber_key`(`receiptNumber`),
    INDEX `inventory_receipts_createdById_idx`(`createdById`),
    INDEX `inventory_receipts_status_idx`(`status`),
    INDEX `inventory_receipts_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory_receipt_items` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `receiptId` BIGINT NOT NULL,
    `variantId` BIGINT NOT NULL,
    `quantity` INTEGER NOT NULL,

    INDEX `inventory_receipt_items_receiptId_idx`(`receiptId`),
    INDEX `inventory_receipt_items_variantId_idx`(`variantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory_issues` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `issueNumber` VARCHAR(50) NOT NULL,
    `orderId` BIGINT NOT NULL,
    `status` ENUM('COMPLETED') NOT NULL DEFAULT 'COMPLETED',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `inventory_issues_issueNumber_key`(`issueNumber`),
    UNIQUE INDEX `inventory_issues_orderId_key`(`orderId`),
    INDEX `inventory_issues_orderId_idx`(`orderId`),
    INDEX `inventory_issues_status_idx`(`status`),
    INDEX `inventory_issues_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory_issue_items` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `issueId` BIGINT NOT NULL,
    `variantId` BIGINT NOT NULL,
    `productName` VARCHAR(255) NOT NULL,
    `sku` VARCHAR(100) NOT NULL,
    `quantity` INTEGER NOT NULL,

    INDEX `inventory_issue_items_issueId_idx`(`issueId`),
    INDEX `inventory_issue_items_variantId_idx`(`variantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddFOREIGN KEY
ALTER TABLE `inventory_receipts` ADD CONSTRAINT `inventory_receipts_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `admin_accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddFOREIGN KEY
ALTER TABLE `inventory_receipt_items` ADD CONSTRAINT `inventory_receipt_items_receiptId_fkey` FOREIGN KEY (`receiptId`) REFERENCES `inventory_receipts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddFOREIGN KEY
ALTER TABLE `inventory_receipt_items` ADD CONSTRAINT `inventory_receipt_items_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `product_variants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddFOREIGN KEY
ALTER TABLE `inventory_issues` ADD CONSTRAINT `inventory_issues_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddFOREIGN KEY
ALTER TABLE `inventory_issue_items` ADD CONSTRAINT `inventory_issue_items_issueId_fkey` FOREIGN KEY (`issueId`) REFERENCES `inventory_issues`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddFOREIGN KEY
ALTER TABLE `inventory_issue_items` ADD CONSTRAINT `inventory_issue_items_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `product_variants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

