// P-1.1.2.P: Protocol Service
// Handles the business logic of formatting requests and parsing responses
// from the external Power Hub, including all XML and MD5 logic.

const axios = require('axios');
const xml2js = require('xml2js');
const crypto = require('crypto');

// --- FIX: Define the MOCK_HUB_RESPONSES variable at the top of the file ---
// This reads the variable set by cross-env in your package.json
const MOCK_HUB_RESPONSES = process.env.MOCK_HUB_RESPONSES === 'true';

const REAL_HUB_API_URL = process.env.HUB_API_URL;
const HUB_USERNAME = process.env.HUB_USERNAME;
const HUB_PASSWORD = process.env.HUB_PASSWORD;
const HUB_KEY = process.env.HUB_KEY;

// --- XML Builder & Parser ---
const xmlBuilder = new xml2js.Builder({ rootName: 'xml', headless: true });
const xmlParser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: false, mergeAttrs: true });

/**
 * Generates the MD5 hash for verification.
 * @param {string} str - The string to hash.
 * @returns {string} The MD5 hash.
 */
function md5(str) {
    return crypto.createHash('md5').update(str).digest('hex');
}

/**
 * Parses an XML string into a JavaScript object.
 * @param {string} xmlString - The raw XML from the hub.
 * @returns {Promise<object>} The parsed JavaScript object.
 */
async function parseXmlResponse(xmlString) {
    try {
        const result = await xmlParser.parseStringPromise(xmlString);
        // The root <xml> or <result> tag is stripped, returning the inner object
        return result.result || result; 
    } catch (parseError) {
        console.error('[PROTOCOL] XML Parse Error:', parseError.message);
        // Create a standardized error object
        return {
            state: '99', // Custom code for "Parse Error"
            message: 'Failed to parse XML response from hub.',
            rawResponse: xmlString
        };
    }
}

/**
 * Creates the XML body and MD5 hashes for a VEND request.
 * @param {object} params - { transID, meterNum, amount }
 * @returns {string} The complete XML request string.
 */
function buildVendRequestXml(params) {
    // Get credentials from environment
    const userName = process.env.HUB_USERNAME;
    const userPass = process.env.HUB_PASSWORD;
    const key = process.env.HUB_KEY;

    // 1. Create password hash
    const userPassHash = md5(userName.toUpperCase() + userPass + key);

    // 2. Create verifyCode hash
    const verifyCodeStr =
        userName.toUpperCase() +
        userPassHash +
        params.transID +
        params.meterNum +
        'M' + // calcMode is 'M' for Money
        params.amount +
        key;
    const verifyCode = md5(verifyCodeStr);

    // 3. Build XML object
    const xmlObject = {
        $: {
            userName: userName,
            userPass: userPassHash,
            transID: params.transID,
            meterNum: params.meterNum,
            calcMode: 'M',
            amount: params.amount,
            verifyCode: verifyCode,
            verifyData: 'DONOTVERIFYDATA' // Use Vending without checking
        }
    };

    // 4. Convert object to XML string
    return xmlBuilder.buildObject(xmlObject);
}

/**
 * --- NEW FUNCTION ---
 * Creates the XML body for a BALANCE request.
 * @returns {string} The complete XML request string.
 */
function buildBalanceRequestXml() {
    const xmlObject = {
        $: {
            userName: HUB_USERNAME,
            userPass: getPassHash()
        }
    };
    return xmlBuilder.buildObject(xmlObject);
}

/**
 * --- NEW FUNCTION ---
 * Creates the XML body for a GETTRANS request.
 * @param {object} params - { meterNum }
 * @returns {string} The complete XML request string.
 */
function buildGetTransRequestXml(params) {
    const xmlObject = {
        $: {
            userName: HUB_USERNAME,
            userPass: getPassHash(),
            meterNum: params.meterNum
        }
    };
    return xmlBuilder.buildObject(xmlObject);
}

/**
 * Generates a mock hub response for testing.
 * @param {string} transID - The transaction ID.
 * @returns {object} A parsed hub response object.
 */
function mockVendResponse(transID) {
    // This simulates the <result> object from the XML spec
    return {
        state: '0',
        code: '04998130126115957078', // Mock Vending Code
        transTime: new Date().toISOString(),
        customerName: 'MOCK CUSTOMER',
        token: '7126 0409 9900 8678 6553', // Mock Token
        invoice: '0000000789', // Mock Invoice
        verifyCode: 'e48fb9d350b0d93a5a0a9f10387bc58b',
        transID: transID,
        rawResponse: '<xml>...mock response...</xml>' // Store raw response
    };
}

/**
 * Generates a mock hub failure response for testing.
 * @param {string} transID - The transaction ID.
 * @returns {object} A parsed hub response object.
 */
function mockFailureResponse(transID) {
    return {
        state: '10', // Mock error state
        message: 'Mock Failure: Insufficient funds.',
        transID: transID,
        rawResponse: '<xml state="10" ...>...mock failure...</xml>' // Store raw response
    };
}

/**
 * --- NEW MOCK ---
 * Generates a mock hub response for a BALANCE request.
 */
function mockBalanceResponse() {
    return {
        state: '0',
        username: HUB_USERNAME,
        balance: '12345.67',
        rawResponse: '<result state="0" balance="12345.67" ... />'
    };
}

/**
 * Generates a mock GETTRANS response.
 * @returns {object} A parsed hub response object.
 */
function mockGetTransResponse() {
    return {
        state: '0',
        count: '3',
        ti0: 'MOCK_ID_1',
        tt0: '2025-11-01 10:30:00',
        ti1: 'MOCK_ID_2',
        tt1: '2025-11-02 11:35:00',
        ti2: 'MOCK_ID_3',
        tt2: '2025-11-03 12:40:00',
        rawResponse: '<result state="0" count="3" ... />'
    };
}

/**
 * Generates a mock hub failure response for testing.
 * @param {string} transID - The transaction ID.
 * @returns {object} A parsed hub response object.
 */
function mockFailureResponse(transID) {
    return {
        state: '10', // Mock error state
        message: 'Mock Failure: Insufficient funds.',
        transID: transID,
        rawResponse: '<xml state="10" ...>...mock failure...</xml>' // Store raw response
    };
}

/**
 * Sends a request to the external Power Hub.
 * @param {string} action - 'VEND', 'CHECK', 'GETTRANS'
 * @param {object} params - The data payload for the request.
 * @param {boolean} useMock - Flag from controller to force mock response.
 * @returns {Promise<object>} The parsed JavaScript object from the hub's XML response.
 */
async function sendRequest(action, params, useMock) {
    console.log(`[PROTOCOL] Sending request. Action: ${action}, Mock: ${useMock}`);

    // --- Mocking Logic ---
    if (useMock || MOCK_HUB_RESPONSES) {
        console.log(`[PROTOCOL] MOCKING hub request for action: ${action}`);
        if (action === 'VEND') {
            return mockVendResponse(params.transID);
            // return mockFailureResponse(params.transID);
        }
        // --- FIX: Add mock logic for BALANCE ---
        if (action === 'BALANCE') {
            return mockBalanceResponse();
        }
        // --- FIX: Add mock logic for GETTRANS ---
        if (action === 'GETTRANS') {
            return mockGetTransResponse();
        }
    }

    // --- Real Hub Logic ---
    let requestXml;
    let hubUrl;

    if (action === 'VEND') {
        requestXml = buildVendRequestXml(params);
        hubUrl = `${REAL_HUB_API_URL}?ACTION=PURCHASE`;
    } 
    // --- FIX: Add real logic for BALANCE ---
    else if (action === 'BALANCE') {
        requestXml = buildBalanceRequestXml();
        hubUrl = `${REAL_HUB_API_URL}?ACTION=BALANCE`; // As per spec
    } 
    // --- FIX: Add real logic for GETTRANS ---
    else if (action === 'GETTRANS') {
        requestXml = buildGetTransRequestXml(params);
        hubUrl = `${REAL_HUB_API_URL}?ACTION=GETTRANS`; // As per spec
    } 
    // --- This is what is currently running ---
    else {
        console.error(`[PROTOCOL] Action '${action}' not implemented.`);
        return { state: '98', message: `Action '${action}' not implemented.` };
    }
    
    console.log(`[PROTOCOL] Sending real request to: ${hubUrl}`);
    console.log(`[PROTOCOL] Request XML: ${requestXml}`);

    try {
        const response = await axios.post(hubUrl, requestXml, {
            headers: { 'Content-Type': 'application/xml' }
        });

        console.log(`[PROTOCOL] Raw XML Response: ${response.data}`);
        
        const parsedResponse = await parseXmlResponse(response.data);
        parsedResponse.rawResponse = response.data; // Store for logging
        
        return parsedResponse;

    } catch (httpError) {
        console.error('[PROTOCOL] HTTP Error:', httpError.message);
        return {
            state: '97', // Custom code for "HTTP Error"
            message: httpError.message,
            rawResponse: httpError.response ? httpError.response.data : 'No response from server'
        };
    }
}


module.exports = {
    sendRequest,
    parseXmlResponse
};
