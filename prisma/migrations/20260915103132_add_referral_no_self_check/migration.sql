ALTER TABLE `referral_relationships`
ADD CONSTRAINT `referral_no_self`
CHECK (`sourceAccountId` IS NULL OR `sourceAccountId` <> `targetAccountId`);