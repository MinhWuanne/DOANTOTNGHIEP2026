ALTER TABLE `inventories`
ADD CONSTRAINT `inventories_quantity_nonnegative`
CHECK (`quantity` >= 0);