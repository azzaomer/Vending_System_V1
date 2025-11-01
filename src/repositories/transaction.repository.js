// P1.1.D: Transaction Repository - Handles all database operations for the audit log (NF-2.2.1)

const dbClient = require('../db_client');

/**
 * Inserts a new transaction request into the audit log with a PENDING status.
 * THIS IS THE FUNCTION THE CONTROLLER IS TRYING TO CALL.
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
 * THIS IS THE *OTHER* FUNCTION THE CONTROLLER IS TRYING TO CALL.
 */
async function updateRequestLog(transID, recordId, responseData) {
    const conn = await dbClient.getConnection();
    const result = responseData.xml || responseData; 

    try {
        const attributes = result.$ || result; 
        const hubState = parseInt(attributes.state) || -1;
        const errorCode = attributes.code || null;
        const tokenReceived = attributes.token || null;
        const invoiceNum = attributes.invoice || null;
        
        const responseXmlString = JSON.stringify(responseData); 

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

        await conn.execute(query, [
            hubState,
            errorCode,
            tokenReceived,
            invoiceNum,
            responseXmlString, 
            transID
        ]);

        console.log(`[AUDIT] Updated log for ${transID}. Status: ${hubState}`);
    } catch (error) {
        console.error(`[AUDIT ERROR] Failed to update log for ${transID}: ${error.message}`);
    } finally {
        conn.release();
    }
}


/**
 * P2.4 - Placeholder function to search for transactions by various identifiers.
 */
async function findTransactionsByIdentifier(identifier, type) {
    console.log(`[AUDIT] Searching for transaction by ${type}: ${identifier}`);
    return [];
}


// ******** THE FIX IS HERE ********
// You must export ALL the functions that the controller needs.
module.exports = {
    logRequest,
    updateRequestLog, 
    findTransactionsByIdentifier
};
