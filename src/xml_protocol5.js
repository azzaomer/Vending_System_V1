// P1.4: XML Protocol Gateway & Communication Engine
const axios = require('axios');
// We still need xml2js for parsing the Hub's response, so we import the parser functions only.
//const parseStringPromise = require('xml2js').parseStringPromise; 

// FIX: We use a try/catch block to aggressively handle the module lookup issue common in Linux/Docker environments.
let xml2js;
try {
    // Attempt standard local lookup first
    xml2js = require('xml2js'); 
} catch (e) {
    // Fallback: This path is often needed on specific Linux/Docker setups where NODE_PATH is misconfigured.
    xml2js = require('/usr/local/lib/node_modules/xml2js');
}

const { calculateUserPassHash, calculateVerifyCode } = require('./security_utils');

// --- Configuration ---
// Hub URL - MUST be managed via environment variables
const HUB_ENDPOINT = process.env.HUB_ENDPOINT || 'http://ServerIP:Port/tpService.php';

// --- Mocking Setup (P4.2) ---
const SHOULD_MOCK_HUB = true; //process.env.MOCK_HUB_RESPONSES === 'true';


/**
 * Builds the complete, security-compliant XML request string.
 * This function now uses pure JavaScript string concatenation to eliminate 
 * the dependency on the crashing XML_BUILDER class.
 * @param {string} action - The protocol action (e.g., 'PURCHASE').
 * @param {object} params - Core transaction parameters (meterNum, amount, transID, verifyData).
 * @returns {string} The final XML string ready for transmission.
 */
function buildXmlRequest(action, params) {
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
 * Sends the XML request to the Hub with retry logic, or returns a mock response.
 * @param {string} action - The protocol action.
 * @param {string} xmlRequest - The final XML string.
 * @returns {object} The parsed JSON response object.
 */
async function sendRequest(action, xmlRequest) {
    // Note: parseStringPromise is defined via the require at the top.

    if (SHOULD_MOCK_HUB) {
        console.log(`[HUB MOCK] Returning simulated SUCCESS response for ACTION: ${action}`);
        
        // This is a sample dual-token response for P2.5 testing (F-1.3.4)
        const mockXmlResponse = `
            <xml state="0" code="0" invoice="INV-${Date.now()}" vendQty="50.00" feeAMT="0.00" balance="500.00" transID="MOCKED_ID">
                <Property name="token" value="12345678901234567890 24680246802468024680"/>
                <Property name="meterInfo" value="SUCCESSFUL MOCK TRANSACTION"/>
            </xml>
        `;
        
        const parsedJson = await parseStringPromise(mockXmlResponse, { explicitArray: false, attrkey: '$' });
        return parsedJson;
    }


    const url = `${HUB_ENDPOINT}?ACTION=${action}`;
    const MAX_RETRIES = 3; 

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            console.log(`[HUB COMM] Attempt ${attempt}: Sending ${action} request...`);
            
            // NF-2.1.1: Use HTTPS client with POST
            const response = await axios.post(url, xmlRequest, {
                headers: { 'Content-Type': 'application/xml' },
                timeout: 15000 // 15 second timeout for Hub response
            });

            // F-1.3.1: Parse the XML response body
            const parsedJson = await parseStringPromise(response.data, { explicitArray: false, attrkey: '$' });
            
            return parsedJson;

        } catch (error) {
            console.error(`[HUB COMM ERROR] Attempt ${attempt} failed.`, error.message);
            
            // P4.S5.T2: Check for transient errors for retry
            if (attempt < MAX_RETRIES && (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT')) {
                const delay = Math.pow(2, attempt) * 1000; // Exponential backoff (2s, 4s, 8s)
                console.log(`Retrying in ${delay / 1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                // Non-transient error or retries exhausted
                throw new Error(`Hub communication failed after ${attempt} attempts: ${error.message}`);
            }
        }
    }
}

module.exports = {
    buildXmlRequest,
    sendRequest
};
