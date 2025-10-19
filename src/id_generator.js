// P1.2: transID Generator (F-1.1.1)
const crypto = require('crypto');

/**
 * Generates a unique transaction ID (max 30 characters).
 * Uses a timestamp + a short random hash to ensure uniqueness and compliance.
 * @returns {string} The unique transaction ID.
 */
function generateUniqueTransID() {
    // 1. Get current timestamp string (e.g., 20251014103055) - Max 14 chars
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);

    // 2. Generate a 16-character random hex string (8 bytes)
    const randomHex = crypto.randomBytes(8).toString('hex');

    // 3. Combine and ensure max length of 30 characters (14 + 16 = 30)
    const transId = `${timestamp}${randomHex}`;
    
    // Safety check (must be <= 30 chars per F-1.1.1 and error -80000)
    if (transId.length > 30) {
        // This should not happen with the current logic, but keeps the function safe.
        return transId.substring(0, 30);
    }
    
    return transId;
}

module.exports = {
    generateUniqueTransID
};

