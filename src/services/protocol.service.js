/**
 * P1.4: Protocol Service
 * * Handles XML construction, security integration, HTTPS communication, and response parsing.
 * * Implements NF-2.1.1 (HTTPS), F-1.3.1 (XML Parsing), and F-1.2.3 (Single-step Vending).
 * * P2.3: Added two-step vending logic (CHECK + PURCHASE).
 */

const axios = require('axios');
const xml2js = require('xml2js');
const { generateTransID } = require('./id.service');
//const { generatieHashedPassword, generateSignature } = require('./security.service');

const { calculateUserPassHash, calculateVerifyCode } = require('./security_utils.js');

// Load environment variables for credentials and endpoint
const HUB_ENDPOINT = process.env.HUB_ENDPOINT;
const TP_USERNAME = process.env.TP_USERNAME;
const TP_SECRET_KEY = process.env.TP_SECRET_KEY; // The raw, unhashed password

// XML builder setup
const xmlBuilder = new xml2js.Builder({
    rootName: 'XMLPackage',
    headless: true, // Do not include XML declaration (<?xml version="1.0" encoding="UTF-8"?>)
    renderOpts: { 'pretty': false }
});

/**
 * Builds the complete, security-compliant XML request string.
 * @param {string} action The protocol action (e.g., 'PURCHASE', 'CHECK').
 * @param {object} params Core transaction parameters (meterNum, amount, verifyData).
 * @param {string} transID The unique transaction ID.
 * @returns {string} The final XML string ready for transmission.
 */
const buildXmlRequest = (action, params, transID) => {
    const { meterNum, amount, verifyData } = params;
    
    // P1.3: Calculate security hashes
    const hashedPassword = generateHashedPassword(TP_SECRET_KEY);
    const signature = generateSignature(transID, meterNum, hashedPassword);
    
    const xmlObject = {
        Transaction: {
            // Header Attributes
            $: {
                transID: transID,
                userName: TP_USERNAME,
                signature: signature,
                action: action,
                // In a real system, userPass might come from the customer, 
                // but here we use the TP secret for gateway authentication.
                userPass: hashedPassword 
            },
            // Transaction Details
            Property: [
                { $: { name: 'meterNum', value: meterNum } },
                { $: { name: 'amount', value: String(amount) } }, 
                { $: { name: 'verifyData', value: verifyData || '' } } 
            ]
        }
    };
    return xmlBuilder.buildObject(xmlObject);
};


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
 * P2.4 - NEW FUNCTION
 * Builds the XML request string for a GETTRANS check (F-1.1.5).
 * @param {string} meterNum - The meter number to check.
 * @returns {string} The final XML string for the GETTRANS action.
 */
function buildGetTransRequest(meterNum) {
    // P1.3: Calculate security hash for authentication
    const userPass = calculateUserPassHash();

    // F-1.1.5: Build the GETTRANS XML package (based on SEDC-ThirdParty-Protocol.pdf, Page 9).
    const xml = `<xml 
    userName="${process.env.TP_USERNAME}" 
    userPass="${userPass}" 
    meterNum="${meterNum}"
    />`;
    
    return xml.replace(/\s\s+/g, ' ').trim();
}


//--------------------------old send request----------------------------------------------//

/**
 * Sends the XML request to the Hub and handles the response.
 * @param {string} action The protocol action.
 * @param {string} xmlPayload The constructed XML string.
 * @returns {object} The parsed JSON representation of the Hub's XML response.
 */

/*
const sendRequest = async (action, xmlPayload) => {
    const url = HUB_ENDPOINT;
    let response;
    
    try {
        console.log(`[HUB COMM] Sending ${action} request to Hub...`);
        
        // NF-2.1.1: Use HTTPS client with POST
        response = await axios.post(url, xmlPayload, {
            headers: { 'Content-Type': 'text/xml' },
            timeout: 30000 // 30 second timeout for Hub response
        });
        
    } catch (error) {
        // Axios error (network failure, timeout, non-200 status)
        throw new Error(`HTTP/Network Error connecting to Hub: ${error.message}`);
    }
    
    // F-1.3.1: Parse the XML Response
    let parsedResponse;
    try {
        parsedResponse = await xml2js.parseStringPromise(response.data, { explicitArray: false });
    } catch (error) {
        throw new Error(`Failed to parse XML response: ${error.message}`);
    }

    // Extract the core Transaction block
    return parsedResponse.XMLPackage.Transaction;
};

*/
//---------------------------------------------------------------------------------------------------//

/**
 * Executes a robust two-step vending transaction (F-1.2.1 CHECK + F-1.2.2 PURCHASE).
 * @param {string} meterNum The target meter number.
 * @param {number} amount The amount of credit/power to vend.
 * @returns {object} The final parsed JSON data from the PURCHASE response.
 */
const vendTwoStep = async (meterNum, amount) => {
    if (!HUB_ENDPOINT || !TP_USERNAME || !TP_SECRET_KEY) {
        throw new Error("Missing critical environment variables.");
    }

    const transID = generateTransID();
    const actionParams = { meterNum, amount, verifyData: '' };
    
    // 1. F-1.2.1: CHECK ACTION
    const checkXml = buildXmlRequest('CHECK', actionParams, transID);
    const checkResponse = await sendRequest('CHECK', checkXml);

    // Protocol check: State 0 means success, any other state means failure (e.g., meter busy)
    const checkState = parseInt(checkResponse.$.state, 10);
    
    if (checkState !== 0) {
        throw new Error(`Meter Check Failed. Hub State: ${checkState}. Code: ${checkResponse.$.code}`);
    }
    
    // 2. F-1.2.2: PURCHASE ACTION (Only proceeds if CHECK was successful)
    // NOTE: We MUST reuse the same transID for the subsequent purchase request in the same session.
    actionParams.verifyData = checkResponse.$.verifyData || ''; // Use verifyData returned from CHECK
    
    const purchaseXml = buildXmlRequest('PURCHASE', actionParams, transID);
    const purchaseResponse = await sendRequest('PURCHASE', purchaseXml);
    
    // Return all data required for the audit log and the front-end receipt
    return {
        transID: transID,
        checkXML: checkXml,
        purchaseXML: purchaseXml,
        finalResponse: purchaseResponse
    };
};

//--------------------------------------------------------------------------------------------------------//


/**
 * Sends the XML request to the Hub with retry logic, or returns a mock response.
// ... (sendRequest function updated to include GETTRANS mock) ...
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

        // P2.4: Add a mock response specifically for the GETTRANS action
        if (action === 'GETTRANS') {
             const mockXmlResponse = `
                <result state="0" count="5"
                ti0="2224" tt0="2013-01-17 23:31:02"
                ti1="2223" tt1="2013-01-17 21:50:31"
                ti2="2222" tt2="2013-01-17 21:49:16"
                ti3="000020002123456" tt3="2013-01-14 15:03:26"
                ti4="000050001123457" tt4="2013-01-13 15:25:13"
                />
             `;
             const parsedJson = await parseStringPromise(mockXmlResponse, { explicitArray: false, attrkey: '$' });
             // Note: GETTRANS returns <result> not <xml>, so we wrap it to match the 'xml' property
             return { xml: { result: parsedJson.result } };
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
        // ... (Live communication logic remains unchanged) ...
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

// Ensure buildBalanceRequest and buildGetTransRequest are included in the export.

module.exports = {
    buildXmlRequest,
    sendRequest,
    buildBalanceRequest,
    vendTwoStep // This is the new primary vending function
};
