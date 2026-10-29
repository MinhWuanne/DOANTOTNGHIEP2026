ALTER TABLE `commission_rules`
ADD CONSTRAINT `commission_rules_percentage_valid`
CHECK (`percentage` >= 0 AND `percentage` <= 100);