CREATE TABLE `demo_clock_state` (
  `id` INT NOT NULL DEFAULT 1,
  `simulatedAt` DATETIME(3) NOT NULL,
  `realTimeAt` DATETIME(3) NOT NULL,
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;