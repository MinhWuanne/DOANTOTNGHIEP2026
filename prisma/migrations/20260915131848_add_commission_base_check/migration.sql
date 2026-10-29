ALTER TABLE `commission_transactions`
ADD CONSTRAINT `commission_transactions_base_nonnegative`
CHECK (`commissionBase` >= 0);