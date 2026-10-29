ALTER TABLE `orders`
ADD CONSTRAINT `orders_discount_valid`
CHECK (`discount` >= 0 AND `discount` <= `subtotal`);