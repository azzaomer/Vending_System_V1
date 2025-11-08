-- 1. Create the dedicated database for the Vending System
-- NOTE: We are using 'vending_system_db' as the default name.
-- If this name needs to be changed, update it across all application configurations.
CREATE DATABASE IF NOT EXISTS vending_system_db;

-- 2. Create a dedicated application user
-- SECURITY BEST PRACTICE: Never use the root user for the application.
-- Replace 'your_app_user' and 'strong_password_here' with secure, unique credentials.

CREATE USER 'Qast_dev'@'localhost' IDENTIFIED WITH mysql_native_password BY 'Qast_db12';

-- 3. Grant only the necessary permissions to the new user
-- The user needs to SELECT (read), INSERT (create logs), UPDATE (update response time), and DELETE (if necessary for maintenance, but generally avoided in audit logs).


GRANT ALL PRIVILEGES
	ON vending_system_db.* TO 'vending_sys'@'localhost';

GRANT SELECT
	ON vending_system_db.* 
	TO 'vending_sys'@'localhost' IDENTIFIED WITH mysql_native_password BY 'Qast_db12';

-- 4. Apply the privileges
FLUSH PRIVILEGES;

-- 5. Switch to the new database to apply the table schema
USE vending_system_db;

-- 6. Execute the schema creation from the transactions_schema.sql file (P1.1)
-- (The actual table creation is in the accompanying file below)
-- This placeholder command assumes the table script will be run next.

SELECT 'MySQL setup complete. Database and user created successfully.' AS Status;


