// Repository Layer: Handles all direct MySQL interactions (P1.1.D)
const dbClient = require('./db_client');

/**
 * Inserts the initial request data into the audit log.
 * @param {object} reqData - Data including transId, meterNum, action, and XML.
 * @returns {number} The ID of the created audit record.
 */
async function createRequestLog(reqData) {
    // Uses the logRequest function from P1.1.D
    return dbClient.logRequest(reqData);
}

/**
 * Updates the audit log with the final response details.
 * @param {number} auditId - The ID of the log entry.
 * @param {object} resData - Response data (tokens, state, XML).
 */
async function updateResponseLog(auditId, resData) {
    // Uses the updateResponse function from P1.1.D
    await dbClient.updateResponse(auditId, resData);
}

/**
 * Retrieves a transaction log entry by transID or meterNum (For ACTION=SEARCH).
 * (Placeholder - P2.4 implementation will complete this)
 * @param {string} identifier - transID or meterNum.
 */
async function findTransaction(identifier) {
    const [rows] = await dbClient.pool.execute(
        'SELECT * FROM transactions WHERE trans_id = ? OR meter_num = ?',
        [identifier, identifier]
    );
    return rows;
}

module.exports = {
    createRequestLog,
    updateResponseLog,
    findTransaction
};


