-- Add referral code to existing Member profiles safely

ALTER TABLE `member_profiles`
ADD COLUMN `referralCode` VARCHAR(50) NULL;

UPDATE `member_profiles` mp
JOIN `user_accounts` ua
  ON ua.id = mp.accountId
SET mp.`referralCode` = CONCAT('MB', LPAD(ua.id, 6, '0'))
WHERE mp.`referralCode` IS NULL;

ALTER TABLE `member_profiles`
MODIFY COLUMN `referralCode` VARCHAR(50) NOT NULL;

CREATE UNIQUE INDEX `member_profiles_referralCode_key`
ON `member_profiles`(`referralCode`);