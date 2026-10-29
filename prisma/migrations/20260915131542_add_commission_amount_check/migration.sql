ALTER TABLE `commission_transactions`
ADD CONSTRAINT `commission_transactions_amount_nonnegative`
CHECK (`amount` >= 0);