CREATE DATABASE IF NOT EXISTS kenaddme_tracker
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'kenaddme_tracker'@'localhost' IDENTIFIED BY '';
CREATE USER IF NOT EXISTS 'kenaddme_tracker'@'127.0.0.1' IDENTIFIED BY '';

GRANT ALL PRIVILEGES ON kenaddme_tracker.* TO 'kenaddme_tracker'@'localhost';
GRANT ALL PRIVILEGES ON kenaddme_tracker.* TO 'kenaddme_tracker'@'127.0.0.1';
FLUSH PRIVILEGES;
