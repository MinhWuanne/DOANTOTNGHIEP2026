ALTER TABLE `order_items`
ADD CONSTRAINT `order_items_quantity_positive`
CHECK (`quantity` > 0);

ALTER TABLE `order_items`
ADD CONSTRAINT `order_items_unit_price_nonnegative`
CHECK (`unitPrice` >= 0);

ALTER TABLE `order_items`
ADD CONSTRAINT `order_items_subtotal_nonnegative`
CHECK (`subtotal` >= 0);