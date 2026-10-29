ALTER TABLE `commission_transactions`
ADD CONSTRAINT `commission_transactions_percentage_valid`
CHECK (`percentage` >= 0 AND `percentage` <= 100);