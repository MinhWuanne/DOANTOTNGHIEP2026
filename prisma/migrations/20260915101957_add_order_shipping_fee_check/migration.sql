ALTER TABLE `orders`
ADD CONSTRAINT `orders_shipping_fee_nonnegative`
CHECK (`shippingFee` >= 0);