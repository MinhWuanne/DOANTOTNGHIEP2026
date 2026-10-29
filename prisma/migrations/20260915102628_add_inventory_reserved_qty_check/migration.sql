ALTER TABLE `inventories`
ADD CONSTRAINT `inventories_reserved_qty_nonnegative`
CHECK (`reservedQty` >= 0);