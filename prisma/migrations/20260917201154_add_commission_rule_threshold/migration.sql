/*
  Add commission rule threshold amount.

  Existing rules use the same threshold:
  <= 3,000,000 VND  -> Standard
  >  3,000,000 VND  -> VIP / Premium
*/

-- Step 1: Add column temporarily nullable
ALTER TABLE `commission_rules`
ADD COLUMN `thresholdAmount` DECIMAL(15, 2) NULL;

-- Step 2: Set threshold for existing rules
UPDATE `commission_rules`
SET `thresholdAmount` = 3000000
WHERE `thresholdAmount` IS NULL;

-- Step 3: Make the column required
ALTER TABLE `commission_rules`
MODIFY COLUMN `thresholdAmount` DECIMAL(15, 2) NOT NULL;