// P1.4: XML Protocol Gateway & Communication Engine
const axios = require('axios');
// We still need xml2js for parsing the Hub's response.
const { parseStringPromise } = require('xml2js');

const { calculateUserPassHash, calculateVerifyCode } = require('./security_utils');

// --- Configuration ---
// Hub URL - MUST be managed via environment variables for production
const HUB_ENDPOINT = process.env.HUB_ENDPOINT || 'https://demo.vending-hub.com/tpService.php'; // Use a safe placeholder

// --- FINAL FIX: Hardcoded Mock Activation ---
// This flag MUST be true to bypass network calls during testing.
// Set to false when ready to connect to the actual Hub.
const SHOULD_MOCK_HUB = true; // <--- HARDCODED TO TRUE
console.log(`[DEBUG - GLOBAL] SHOULD_MOCK_HUB is definitely set to: ${SHOULD_MOCK_HUB}`);


/**
 * Builds the complete, security-compliant XML request string using pure JavaScript.
 * @param {string} action - The protocol action (e.g., 'PURCHASE').
 * @param {object} params - Core transaction parameters (meterNum, amount, transID, verifyData).
 * @returns {string} The final XML string ready for transmission.
 */
function buildXmlRequest(action, params) {
    // ... (buildXmlRequest function remains unchanged) ...
    const { transID, meterNum, calcMode, amount, verifyData } = params;

    // P1.3: Calculate security hashes
    const userPass = calculateUserPassHash();
    const verifyCode = calculateVerifyCode({ transID, meterNum, calcMode, amount });

    // F-1.3.1: Build the final XML package using string concatenation
    const xml = `<xml
    userName="${process.env.TP_USERNAME}"
    userPass="${userPass}"
    transID="${transID}"
    meterNum="${meterNum}"
    calcMode="${calcMode}"
    amount="${amount}"
    verifyCode="${verifyCode}"
    verifyData="${verifyData || ''}"
    />`;

    return xml.replace(/\s\s+/g, ' ').trim(); // Clean up extra whitespace/newlines
}

/**
 * P2.4 - NEW FUNCTION
 * Builds the XML request string for a BALANCE check (F-1.1.4).
 * This request is simpler and only requires authentication.
 * @returns {string} The final XML string for the BALANCE action.
 */
function buildBalanceRequest() {
    // P1.3: Calculate security hash for authentication
    const userPass = calculateUserPassHash();

    // F-1.1.4: Build the BALANCE XML package.
    const xml = `<xml 
    userName="${process.env.TP_USERNAME}" 
    userPass="${userPass}" 
    />`;
    
    return xml.replace(/\s\s+/g, ' ').trim();
}


/**
 * Sends the XML request to the Hub with retry logic, or returns a mock response.
 * @param {string} action - The protocol action.
 * @param {string} xmlRequest - The final XML string.
 * @returns {object} The parsed JSON response object.
 */
async function sendRequest(action, xmlRequest) {

    // --- ENHANCED DEBUG LOGGING ---
    console.log(`[DEBUG - sendRequest ENTRY] Function called. Checking SHOULD_MOCK_HUB: ${SHOULD_MOCK_HUB}`);

    // --- SIMPLIFIED MOCK CHECK ---
    // If mocking is enabled, return the simulated response immediately.
    if (SHOULD_MOCK_HUB === true) { // Explicit boolean check
        console.log(`[HUB MOCK] Condition met! Returning simulated SUCCESS response for ACTION: ${action}`);

	    // P2.4: Add a mock response specifically for the BALANCE action
        if (action === 'BALANCE') {
             const mockXmlResponse = `
                <xml state="0" username="${process.env.TP_USERNAME}" balance="102803.62"/>
             `;
             const parsedJson = await parseStringPromise(mockXmlResponse, { explicitArray: false, attrkey: '$' });
             return { xml: parsedJson }; // Return mock data
        }




	// Default: Mock response for PURCHASE action
        const mockXmlResponse = `
            <xml state="0" code="0" invoice="INV-${Date.now()}" vendQty="50.00" feeAMT="0.00" balance="500.00" transID="MOCKED_ID">
                <Property name="token" value="12345678901234567890 24680246802468024680"/>
                <Property name="meterInfo" value="SUCCESSFUL MOCK TRANSACTION"/>
            </xml>
        `;

        try {
            const parsedJson = await parseStringPromise(mockXmlResponse, { explicitArray: false, attrkey: '$' });
             console.log("[DEBUG - MOCK] Mock XML parsed successfully.");
            return { xml: parsedJson }; // Return mock data
        } catch (parseError) {
             console.error("[DEBUG - MOCK ERROR] Failed to parse mock XML:", parseError);
             throw new Error("Internal error parsing mock response."); // Fail explicitly if mock parsing breaks
        }
    } else {
        // --- Live Hub Communication (Only runs if SHOULD_MOCK_HUB is false or undefined) ---
        console.log(`[HUB COMM] Mocking condition NOT met (Value: ${SHOULD_MOCK_HUB}). Attempting live connection to ${HUB_ENDPOINT}...`);
        const url = `${HUB_ENDPOINT}?ACTION=${action}`;
        const MAX_RETRIES = 3;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                console.log(`[HUB COMM] Attempt ${attempt}: Sending ${action} request...`);

                const response = await axios.post(url, xmlRequest, {
                    headers: { 'Content-Type': 'application/xml' },
                    timeout: 15000
                });
                console.log("[DEBUG - HUB] Received response from Hub.");
                const parsedJson = await parseStringPromise(response.data, { explicitArray: false, attrkey: '$' });
                 console.log("[DEBUG - HUB] Hub XML parsed successfully.");
                return { xml: parsedJson };

            } catch (error) {
                console.error(`[HUB COMM ERROR] Attempt ${attempt} failed.`, error.code || error.message); // Log error code

                if (attempt < MAX_RETRIES && (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND')) { // Added ENOTFOUND
                    const delay = Math.pow(2, attempt) * 1000;
                    console.log(`Retrying in ${delay / 1000} seconds...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    console.error("[DEBUG - HUB ERROR] Max retries reached or non-retryable error.");
                    throw new Error(`Hub communication failed after ${attempt} attempts: ${error.message}`);
                }
            }
        }
    }
     // Fallback if loop finishes unexpectedly (shouldn't happen with throw)
     console.error("[DEBUG - UNEXPECTED] sendRequest finished without returning or throwing.");
     throw new Error("Unexpected end of sendRequest function.");
}

module.exports = {
    buildXmlRequest,
    sendRequest
};
