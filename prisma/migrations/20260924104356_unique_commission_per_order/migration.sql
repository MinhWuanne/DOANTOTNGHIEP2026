/*
  Warnings:

  - A unique constraint covering the columns `[orderId]` on the table `commission_transactions` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `commission_transactions_orderId_key` ON `commission_transactions`(`orderId`);
