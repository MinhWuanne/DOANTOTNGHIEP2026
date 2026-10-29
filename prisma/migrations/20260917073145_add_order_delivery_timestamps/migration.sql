-- AlterTable
ALTER TABLE `orders` ADD COLUMN `customerReceivedAt` DATETIME(3) NULL,
    ADD COLUMN `estimatedDeliveryAt` DATETIME(3) NULL,
    ADD COLUMN `shippedAt` DATETIME(3) NULL;
