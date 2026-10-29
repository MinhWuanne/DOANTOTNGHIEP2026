ALTER TABLE `product_variants`
ADD CONSTRAINT `product_variants_compare_at_price_nonnegative`
CHECK (`compareAtPrice` IS NULL OR `compareAtPrice` >= 0);