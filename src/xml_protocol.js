// P1.4: XML Protocol Gateway & Communication Engine
const axios = require('axios');
const xml2js = require('xml2js');
const { calculateUserPassHash, calculateVerifyCode } = require('./security_utils');

// Hub URL - MUST be managed via environment variables
const HUB_ENDPOINT = process.env.HUB_ENDPOINT || 'http://ServerIP:Port/tpService.php';
const XML_BUILDER = new xml2js.Builder({ rootName: 'xml', headless: true, renderOpts: { pretty: false } });


/**
 * Builds the complete, security-compliant XML request string.
 * @param {string} action - The protocol action (e.g., 'PURCHASE').
 * @param {object} params - Core transaction parameters (meterNum, amount, transID, verifyData).
 * @returns {string} The final XML string ready for transmission.
 */
function buildXmlRequest(action, params) {
    const { transID, meterNum, calcMode, amount, verifyData } = params;
    
    // P1.3: Calculate security hashes
    const userPass = calculateUserPassHash();
    const verifyCode = calculateVerifyCode({ transID, meterNum, calcMode, amount });

    const requestData = {
        $: {
            userName: process.env.TP_USERNAME,
            userPass: userPass,
            transID: transID,
            meterNum: meterNum,
            calcMode: calcMode,
            amount: amount,
            verifyCode: verifyCode,
            verifyData: verifyData || '' // Ensure verifyData is always present
        }
    };
    
    // F-1.3.1: Build the final XML package
    return XML_BUILDER.build(requestData);
}

/**
 * Sends the XML request to the Hub with retry logic.
 * @param {string} action - The protocol action.
 * @param {string} xmlRequest - The final XML string.
 * @returns {object} The parsed JSON response object.
 */
async function sendRequest(action, xmlRequest) {
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
            const parsedJson = await xml2js.parseStringPromise(response.data, { explicitArray: false, attrkey: '$' });
            
            // Check for connection/protocol errors (e.g., -10081) if needed, but primarily rely on XML parser success
            return parsedJson;

        } catch (error) {
            console.error(`[HUB COMM ERROR] Attempt ${attempt} failed.`, error.message);
            
            // P4.S5.T2: Check for transient errors for retry (e.g., -10081 Connect failed)
            if (attempt < MAX_RETRIES && error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
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

