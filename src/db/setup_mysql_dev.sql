-- 1. Create the dedicated database for the Vending System
CREATE DATABASE IF NOT EXISTS vending_system_db;

-- 2. Create the dedicated application user
-- We use 'vending_sys' consistently now, using the secure default password plugin.
CREATE USER IF NOT EXISTS 'Qast_dev'@'localhost' IDENTIFIED BY 'Qast_db12';

-- 3. Grant ALL necessary permissions to the new user on the new database
GRANT ALL PRIVILEGES
	ON vending_system_db.* TO 'vending_sys'@'localhost';

-- 4. Apply the privileges
FLUSH PRIVILEGES;

-- 5. Switch to the new database to apply the table schema
USE vending_system_db;

-- 6. Final Status confirmation
SELECT 'MySQL setup complete. Database and user created successfully.' AS Status;
