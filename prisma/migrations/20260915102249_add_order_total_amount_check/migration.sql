ALTER TABLE `orders`
ADD CONSTRAINT `orders_total_amount_valid`
CHECK (`totalAmount` = `subtotal` + `shippingFee` - `discount`);