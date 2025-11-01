// P1.1.D: Database Client - Handles MySQL connection pooling and acquisition.

const mysql = require('mysql2/promise');

// --- Configuration ---
// Load database credentials securely from environment variables (NF-2.1.3)
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'vending_app_user',
    password: process.env.DB_PASSWORD, // Must be set in .env
    database: process.env.DB_NAME || 'vending_system_db',
    waitForConnections: true,
    connectionLimit: 10, // Adjust pool size as needed
    queueLimit: 0
};

// --- Connection Pool ---
// Create the pool only once when the module loads.
let pool;
try {
    pool = mysql.createPool(dbConfig);
    console.log("[DB] MySQL connection pool created successfully.");
} catch (error) {
    console.error("[DB FATAL] Failed to create MySQL connection pool:", error);
    // If the pool fails to create, the application cannot run.
    process.exit(1); 
}


/**
 * Acquires a connection from the pool.
 * Remember to release the connection using connection.release() when done.
 * @returns {Promise<mysql.PoolConnection>} A promise that resolves with a connection object.
 */
async function getConnection() {
    if (!pool) {
        console.error("[DB ERROR] Attempted to get connection before pool was initialized.");
        throw new Error("Database pool not available.");
    }
    try {
        const connection = await pool.getConnection();
        // console.log("[DB] Acquired connection from pool."); // Optional: Verbose logging
        return connection;
    } catch (error) {
        console.error("[DB ERROR] Failed to acquire connection from pool:", error);
        throw error; // Re-throw the error to be handled by the caller
    }
}

/**
 * Performs a simple query to check if the database connection is alive.
 * Used for startup verification in server.js.
 */
async function checkConnection() {
    let connection = null;
    try {
        connection = await getConnection();
        await connection.ping(); // Simple, low-overhead query
        console.log('[DB] Database connection test successful.');
    } catch (error) {
        console.error('[DB ERROR] Database connection test failed:', error.message);
        throw error; // Re-throw to signal fatal startup error
    } finally {
        if (connection) {
            connection.release(); // Always release the connection
            // console.log("[DB] Released test connection."); // Optional: Verbose logging
        }
    }
}


// Export the necessary functions and potentially the pool itself if needed elsewhere
module.exports = {
    pool, // Export the pool for potential direct use (e.g., transactions)
    getConnection, // <-- FIX: Ensure this is exported
    checkConnection // <-- FIX: Ensure this is exported for server startup
};


