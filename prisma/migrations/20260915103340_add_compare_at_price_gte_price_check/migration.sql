ALTER TABLE `product_variants`
ADD CONSTRAINT `product_variants_compare_at_price_gte_price`
CHECK (`compareAtPrice` IS NULL OR `compareAtPrice` >= `price`);