-- AlterTable
ALTER TABLE `wallet_transactions` MODIFY `type` ENUM('TOP_UP', 'COMMISSION', 'ORDER_PAYMENT', 'WITHDRAWAL', 'REFUND') NOT NULL;

-- CreateTable
CREATE TABLE `return_requests` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `orderId` BIGINT NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
    `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `approvedAt` DATETIME(3) NULL,
    `refundedAt` DATETIME(3) NULL,
    `note` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `return_requests_orderId_key`(`orderId`),
    INDEX `return_requests_status_idx`(`status`),
    INDEX `return_requests_requestedAt_idx`(`requestedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `return_requests` ADD CONSTRAINT `return_requests_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
