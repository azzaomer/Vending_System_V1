// P1.3: MD5 Hashing Engine - Implements NF-2.1.2 security requirements
const crypto = require('crypto');

// Load credentials securely from environment (NF-2.1.3)
const TP_USERNAME = process.env.TP_USERNAME;
const TP_USERPASS = process.env.TP_USERPASS;
const TP_SECRET_KEY = process.env.TP_SECRET_KEY;

/**
 * Creates a standard MD5 hash of a given string.
 * @param {string} text - The input string.
 * @returns {string} The 32-character hexadecimal MD5 hash.
 */
function md5(text) {
    if (typeof text !== 'string') {
        console.warn(`[SECURITY] MD5 input was not a string, coercing. Input: ${text}`);
        text = String(text);
    }
    return crypto.createHash('md5').update(text).digest('hex');
}

/**
 * Calculates the proprietary triple-hashed 'userPass' for authentication.
 * This is the function that was 'not defined'.
 * @returns {string} The final userPass hash.
 */
function calculateUserPassHash() {
    if (!TP_USERNAME || !TP_USERPASS || !TP_SECRET_KEY) {
        console.error("[SECURITY ERROR] Missing TP_USERNAME, TP_USERPASS, or TP_SECRET_KEY in .env");
        // Return a dummy hash to prevent crashes, though the request will fail
        return 'd41d8cd98f00b204e9800998ecf8427e'; 
    }
    
    // Per protocol: "hash user password three times with username+userPass and key (username+userPass, encoded by md5...)"
    // This is ambiguous. We will use the most robust interpretation:
    // md5( md5(md5(TP_USERPASS) + TP_USERNAME) + TP_SECRET_KEY )

    try {
        const pass1 = md5(TP_USERPASS);
        // Protocol often requires username uppercase
        const pass2 = md5(pass1 + TP_USERNAME.toUpperCase()); 
        const finalPass = md5(pass2 + TP_SECRET_KEY);
        
        return finalPass;
    } catch (error) {
        console.error("[SECURITY ERROR] Failed during userPass hash calculation:", error);
        return 'd41d8cd98f00b204e9800998ecf8427e';
    }
}

/**
 * Calculates the 'verifyCode' (transaction signature).
 * @param {object} params - Transaction parameters.
 *Required fields: transID, meterNum, calcMode, amount
 */
function calculateVerifyCode({ transID, meterNum, calcMode, amount }) {
    if (!TP_USERNAME || !TP_SECRET_KEY || !transID || !meterNum) {
         console.error("[SECURITY ERROR] Missing data for verifyCode calculation.");
         return 'd41d8cd98f00b204e9800998ecf8427e';
    }
    
    // Per protocol: (username + (Hash userPass) + transID + meterNum + calcMode + amount + key)
    const hashedUserPass = calculateUserPassHash();
    
    const hashInput = 
        `${TP_USERNAME.toUpperCase()}` + // Use uppercase username
        `${hashedUserPass}` +
        `${transID}` +
        `${meterNum}` +
        `${calcMode}` +
        `${amount}` +
        `${TP_SECRET_KEY}`;

    return md5(hashInput);
}

// --- FIX: Ensure all required functions are exported ---
module.exports = {
    calculateUserPassHash,
    calculateVerifyCode
};
