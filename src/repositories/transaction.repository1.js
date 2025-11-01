// P1.1.D: Transaction Repository - Handles all database operations for the audit log (NF-2.2.1)

const dbClient = require('../db_client');

/**
 * Inserts a new transaction request into the audit log with a PENDING status.
 * @param {string} transID - The unique transaction ID.
 * @param {string} meterNum - The meter number.
 * @param {string} action - The protocol action (e.g., PURCHASE).
 * @param {string} requestXml - The complete XML request string sent to the Hub.
 * @returns {number} The ID of the newly created audit record.
 */
async function logRequest(transID, meterNum, action, requestXml) {
    const conn = await dbClient.getConnection();
    let recordId = null;

    try {
        const query = `
            INSERT INTO transactions 
            (trans_id, meter_num, action_requested, request_xml, hub_state, request_timestamp)
            VALUES (?, ?, ?, ?, ?, NOW())
        `;
        const [result] = await conn.execute(query, [transID, meterNum, action, requestXml, -1]); // -1 = PENDING

        recordId = result.insertId;
        console.log(`[AUDIT] Request logged for ${transID}. Record ID: ${recordId}`);
    } catch (error) {
        // Logging is critical. Throw an explicit error if DB fails to prevent silent failure.
        console.error(`[AUDIT ERROR] Failed to log request for ${transID}: ${error.message}`);
        throw new Error("Database logging failed.");
    } finally {
        conn.release();
    }
    return recordId;
}

/**
 * Updates an existing transaction record with the final response details and status.
 * This function resolves the 'transactionRepo.updateRequestLog is not a function' error.
 * @param {string} transID - The unique transaction ID.
 * @param {number} recordId - The initial audit record ID (optional, but robust).
 * @param {object} responseData - The parsed JSON response object from the Hub.
 */
async function updateRequestLog(transID, recordId, responseData) {
    const conn = await dbClient.getConnection();
    const result = responseData.xml || responseData; // Handle nested XML structure if necessary

    try {
        // Extract required fields from the parsed Hub response (result)
        const hubState = parseInt(result.$.state) || -1;
        const errorCode = result.$.code || null;
        const tokenReceived = result.$.token || null;
        const invoiceNum = result.$.invoice || null;

        // P2.5: For audit, we only need the key data and the full XML response.
        const query = `
            UPDATE transactions SET
            hub_state = ?,
            hub_error_code = ?,
            token_received = ?,
            invoice_num = ?,
            response_xml = ?,
            response_timestamp = NOW()
            WHERE trans_id = ? 
            LIMIT 1
        `;

        // The parsed object might be nested, so we check for the expected attributes
        await conn.execute(query, [
            hubState,
            errorCode,
            tokenReceived,
            invoiceNum,
            JSON.stringify(responseData), // Store full response data as JSON for complete audit (NF-2.2.1)
            transID
        ]);

        console.log(`[AUDIT] Updated log for ${transID}. Status: ${hubState}`);
    } catch (error) {
        console.error(`[AUDIT ERROR] Failed to log request for ${transID}: ${error.message}`);
        // Do NOT throw here; the transaction might have succeeded even if logging failed.
    } finally {
        conn.release();
    }
}


/**
 * P2.4 - Searches for transactions in the audit log.
 * Implements F-1.1.3: Search by transID (exact match) or meterNum (latest match).
 * @param {string} identifier - The transID or meterNum to search for.
 * @param {'transID' | 'meterNum'} type - The type of identifier provided.
 * @returns {object | null} The found transaction record or null if not found.
 */
async function findTransactionsByIdentifier(identifier, type = 'transID') {
    console.log(`[AUDIT] Searching for transaction by ${type}: ${identifier}`);
    const conn = await dbClient.getConnection();
    let transaction = null;

    try {
        let query = `SELECT * FROM transactions WHERE `;
        const params = [identifier];

        if (type === 'transID') {
            query += `trans_id = ? LIMIT 1`;
        } else if (type === 'meterNum') {
            // Find the *latest* transaction for a given meter number
            query += `meter_num = ? ORDER BY request_timestamp DESC LIMIT 1`;
        } else {
            throw new Error("Invalid search type provided. Must be 'transID' or 'meterNum'.");
        }

        const [rows] = await conn.execute(query, params);

        if (rows.length > 0) {
            transaction = rows[0];
            // Attempt to parse the stored XML/JSON string back into an object for easier use
            try {
                 if (transaction.response_xml) {
                     transaction.response_data = JSON.parse(transaction.response_xml);
                 }
            } catch (parseError) {
                 console.warn(`[AUDIT] Could not parse response_xml for trans_id ${transaction.trans_id}`);
                 transaction.response_data = null; // Indicate parsing failed
            }
            console.log(`[AUDIT] Found transaction ID: ${transaction.id}`);
        } else {
            console.log(`[AUDIT] No transaction found for ${type}: ${identifier}`);
        }
    } catch (error) {
        console.error(`[AUDIT ERROR] Failed to search transaction for ${type} ${identifier}: ${error.message}`);
        // Do not throw; return null to indicate search failure
    } finally {
        conn.release();
    }
    return transaction; // Returns the full row object or null
}

module.exports = {
    logRequest,
    updateRequestLog, // <-- FIX: This function is now correctly defined and exporte
    findTransactionsByIdentifier // <-- Now includes the search function

};
