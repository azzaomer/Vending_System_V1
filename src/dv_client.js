// P1.1.D: Audit Logging Utility
// Uses the standard 'mysql2' library for Node.js.
const mysql = require('mysql2/promise');

// Configuration should come from environment variables for security (NF-2.1.3)
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'your_app_user', // from setup_mysql_server.sql
    password: process.env.DB_PASSWORD || 'strong_password_here',
    database: process.env.DB_NAME || 'vending_system_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

/**
 * Logs a transaction request and prepares the audit record.
 * @param {object} params - Request parameters containing the final XML string.
 * @returns {number} The ID of the newly created audit record.
 */
async function logRequest(params) {
    const { transId, meterNum, actionRequested, requestXml, userId } = params;
    const sql = `
        INSERT INTO transactions 
        (trans_id, user_id, meter_num, action_requested, request_xml, hub_state)
        VALUES (?, ?, ?, ?, ?, -1)`; // Initial state is -1 (pending)
    
    try {
        const [result] = await pool.execute(sql, [transId, userId, meterNum, actionRequested, requestXml]);
        console.log(`[AUDIT] Request logged for ${transId}`);
        return result.insertId;
    } catch (error) {
        console.error(`[AUDIT ERROR] Failed to log request for ${transId}:`, error.message);
        throw new Error('Database logging failed.');
    }
}

/**
 * Updates the audit record with the response data from the Hub.
 * @param {number} auditId - The ID of the initial audit record (from logRequest).
 * @param {object} responseData - Parsed response data including tokens and state.
 */
async function updateResponse(auditId, responseData) {
    const {
        state, code, token, invoiceNum, amountRequested, responseXml
    } = responseData;

    const sql = `
        UPDATE transactions SET
        response_timestamp = CURRENT_TIMESTAMP(),
        hub_state = ?,
        hub_error_code = ?,
        token_received = ?,
        invoice_num = ?,
        amount_requested = ?,
        response_xml = ?
        WHERE id = ?`;

    try {
        await pool.execute(sql, [
            state, code, token, invoiceNum, amountRequested, responseXml, auditId
        ]);
        console.log(`[AUDIT] Response updated for Audit ID: ${auditId}`);
    } catch (error) {
        console.error(`[AUDIT ERROR] Failed to update response for ID ${auditId}:`, error.message);
        // Do not re-throw, as the transaction may have already succeeded, but log the failure.
    }
}

module.exports = {
    logRequest,
    updateResponse,
    pool // Export the pool for other database operations (e.g., SEARCH)
};

