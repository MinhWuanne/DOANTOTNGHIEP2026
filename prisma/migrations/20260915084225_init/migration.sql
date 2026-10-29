-- CreateTable
CREATE TABLE `persons` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `fullName` VARCHAR(150) NOT NULL,
    `email` VARCHAR(255) NULL,
    `phone` VARCHAR(20) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `persons_fullName_idx`(`fullName`),
    INDEX `persons_phone_idx`(`phone`),
    INDEX `persons_email_idx`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_accounts` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `personId` BIGINT NOT NULL,
    `platform` ENUM('MEMBER', 'FRANCHISE') NOT NULL,
    `email` VARCHAR(255) NULL,
    `phone` VARCHAR(20) NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'LOCKED') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `user_accounts_personId_idx`(`personId`),
    INDEX `user_accounts_platform_idx`(`platform`),
    INDEX `user_accounts_status_idx`(`status`),
    UNIQUE INDEX `user_accounts_personId_platform_key`(`personId`, `platform`),
    UNIQUE INDEX `user_accounts_platform_email_key`(`platform`, `email`),
    UNIQUE INDEX `user_accounts_platform_phone_key`(`platform`, `phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `member_profiles` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `accountId` BIGINT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `member_profiles_accountId_key`(`accountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `franchise_profiles` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `accountId` BIGINT NOT NULL,
    `franchiseCode` VARCHAR(50) NOT NULL,
    `status` ENUM('ACTIVE', 'SUSPENDED', 'LOCKED', 'TERMINATED') NOT NULL DEFAULT 'ACTIVE',
    `parentFranchiseId` BIGINT NULL,
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `franchise_profiles_accountId_key`(`accountId`),
    UNIQUE INDEX `franchise_profiles_franchiseCode_key`(`franchiseCode`),
    INDEX `franchise_profiles_parentFranchiseId_idx`(`parentFranchiseId`),
    INDEX `franchise_profiles_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `referral_relationships` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `targetAccountId` BIGINT NOT NULL,
    `sourceAccountId` BIGINT NULL,
    `sourceType` ENUM('NONE', 'MEMBER', 'FRANCHISE') NOT NULL DEFAULT 'NONE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `referral_relationships_targetAccountId_key`(`targetAccountId`),
    INDEX `referral_relationships_sourceAccountId_idx`(`sourceAccountId`),
    INDEX `referral_relationships_sourceType_idx`(`sourceType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categories` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(150) NOT NULL,
    `slug` VARCHAR(180) NOT NULL,
    `description` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `categories_slug_key`(`slug`),
    INDEX `categories_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `products` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `categoryId` BIGINT NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `slug` VARCHAR(280) NOT NULL,
    `description` TEXT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'OUT_OF_STOCK', 'DISCONTINUED') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `products_slug_key`(`slug`),
    INDEX `products_categoryId_idx`(`categoryId`),
    INDEX `products_status_idx`(`status`),
    INDEX `products_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_variants` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `productId` BIGINT NOT NULL,
    `sku` VARCHAR(100) NOT NULL,
    `name` VARCHAR(150) NULL,
    `price` DECIMAL(15, 2) NOT NULL,
    `compareAtPrice` DECIMAL(15, 2) NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'OUT_OF_STOCK', 'DISCONTINUED') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `product_variants_sku_key`(`sku`),
    INDEX `product_variants_productId_idx`(`productId`),
    INDEX `product_variants_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventories` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `variantId` BIGINT NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 0,
    `reservedQty` INTEGER NOT NULL DEFAULT 0,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `inventories_variantId_key`(`variantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `addresses` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `personId` BIGINT NOT NULL,
    `type` ENUM('HOME', 'OFFICE', 'OTHER') NOT NULL DEFAULT 'HOME',
    `receiverName` VARCHAR(150) NOT NULL,
    `phone` VARCHAR(20) NOT NULL,
    `addressLine` VARCHAR(255) NOT NULL,
    `ward` VARCHAR(100) NULL,
    `district` VARCHAR(100) NULL,
    `province` VARCHAR(100) NOT NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `addresses_personId_idx`(`personId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `carts` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `accountId` BIGINT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `carts_accountId_key`(`accountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cart_items` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `cartId` BIGINT NOT NULL,
    `variantId` BIGINT NOT NULL,
    `quantity` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `cart_items_variantId_idx`(`variantId`),
    UNIQUE INDEX `cart_items_cartId_variantId_key`(`cartId`, `variantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `orders` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `accountId` BIGINT NOT NULL,
    `addressId` BIGINT NULL,
    `orderNumber` VARCHAR(50) NOT NULL,
    `platform` ENUM('MEMBER', 'FRANCHISE') NOT NULL,
    `status` ENUM('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPING', 'DELIVERED', 'CANCELLED', 'RETURNED') NOT NULL DEFAULT 'PENDING',
    `paymentStatus` ENUM('UNPAID', 'PENDING', 'PAID', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'UNPAID',
    `paymentMethod` ENUM('COD', 'BANK_TRANSFER', 'ONLINE') NOT NULL DEFAULT 'COD',
    `subtotal` DECIMAL(15, 2) NOT NULL,
    `shippingFee` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `discount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `totalAmount` DECIMAL(15, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `orders_orderNumber_key`(`orderNumber`),
    INDEX `orders_accountId_idx`(`accountId`),
    INDEX `orders_platform_idx`(`platform`),
    INDEX `orders_status_idx`(`status`),
    INDEX `orders_paymentStatus_idx`(`paymentStatus`),
    INDEX `orders_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order_items` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `orderId` BIGINT NOT NULL,
    `variantId` BIGINT NOT NULL,
    `productName` VARCHAR(255) NOT NULL,
    `sku` VARCHAR(100) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `unitPrice` DECIMAL(15, 2) NOT NULL,
    `subtotal` DECIMAL(15, 2) NOT NULL,

    INDEX `order_items_orderId_idx`(`orderId`),
    INDEX `order_items_variantId_idx`(`variantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `commission_rules` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(150) NOT NULL,
    `platform` ENUM('MEMBER', 'FRANCHISE') NOT NULL,
    `percentage` DECIMAL(5, 2) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `commission_rules_platform_idx`(`platform`),
    INDEX `commission_rules_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `commission_transactions` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `orderId` BIGINT NOT NULL,
    `accountId` BIGINT NOT NULL,
    `ruleId` BIGINT NULL,
    `platform` ENUM('MEMBER', 'FRANCHISE') NOT NULL,
    `sourceType` ENUM('MEMBER_ORDER', 'FRANCHISE_ORDER') NOT NULL,
    `commissionBase` DECIMAL(15, 2) NOT NULL,
    `percentage` DECIMAL(5, 2) NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'PAID', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `commission_transactions_orderId_idx`(`orderId`),
    INDEX `commission_transactions_accountId_idx`(`accountId`),
    INDEX `commission_transactions_platform_idx`(`platform`),
    INDEX `commission_transactions_status_idx`(`status`),
    INDEX `commission_transactions_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_accounts` ADD CONSTRAINT `user_accounts_personId_fkey` FOREIGN KEY (`personId`) REFERENCES `persons`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `member_profiles` ADD CONSTRAINT `member_profiles_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `user_accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `franchise_profiles` ADD CONSTRAINT `franchise_profiles_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `user_accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `franchise_profiles` ADD CONSTRAINT `franchise_profiles_parentFranchiseId_fkey` FOREIGN KEY (`parentFranchiseId`) REFERENCES `franchise_profiles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `referral_relationships` ADD CONSTRAINT `referral_relationships_targetAccountId_fkey` FOREIGN KEY (`targetAccountId`) REFERENCES `user_accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `referral_relationships` ADD CONSTRAINT `referral_relationships_sourceAccountId_fkey` FOREIGN KEY (`sourceAccountId`) REFERENCES `user_accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_variants` ADD CONSTRAINT `product_variants_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventories` ADD CONSTRAINT `inventories_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `product_variants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `addresses` ADD CONSTRAINT `addresses_personId_fkey` FOREIGN KEY (`personId`) REFERENCES `persons`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `carts` ADD CONSTRAINT `carts_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `user_accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cart_items` ADD CONSTRAINT `cart_items_cartId_fkey` FOREIGN KEY (`cartId`) REFERENCES `carts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cart_items` ADD CONSTRAINT `cart_items_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `product_variants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `user_accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_addressId_fkey` FOREIGN KEY (`addressId`) REFERENCES `addresses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `product_variants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commission_transactions` ADD CONSTRAINT `commission_transactions_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commission_transactions` ADD CONSTRAINT `commission_transactions_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `user_accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commission_transactions` ADD CONSTRAINT `commission_transactions_ruleId_fkey` FOREIGN KEY (`ruleId`) REFERENCES `commission_rules`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
