ALTER TABLE `inventories`
ADD CONSTRAINT `inventories_reserved_qty_valid`
CHECK (`reservedQty` <= `quantity`);