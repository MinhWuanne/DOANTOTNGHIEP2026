
CREATE TRIGGER `referral_no_self_before_insert`
BEFORE INSERT ON `referral_relationships`
FOR EACH ROW
BEGIN
  IF NEW.`sourceAccountId` IS NOT NULL
     AND NEW.`sourceAccountId` = NEW.`targetAccountId` THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'An account cannot refer itself';
  END IF;
END;

CREATE TRIGGER `referral_no_self_before_update`
BEFORE UPDATE ON `referral_relationships`
FOR EACH ROW
BEGIN
  IF NEW.`sourceAccountId` IS NOT NULL
     AND NEW.`sourceAccountId` = NEW.`targetAccountId` THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'An account cannot refer itself';
  END IF;
END;
