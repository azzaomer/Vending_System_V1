/**
 * P1.4: Protocol Service
 * * Handles XML construction, security integration, HTTPS communication, and response parsing.
 * * Implements NF-2.1.1 (HTTPS), F-1.3.1 (XML Parsing), and F-1.2.3 (Single-step Vending).
 * * NOTE: This service requires 'axios' for HTTPS and 'xml2js' for XML parsing.
 * Install them: npm install axios xml2js
 */

const axios = require('axios');
const xml2js = require('xml2js');
const { generateTransID } = require('./id.service');
const { generateHashedPassword, generateSignature } = require('./security.service');

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
 * Executes a single-step vending transaction (F-1.2.3).
 * @param {string} meterNum The target meter number.
 * @param {number} amount The amount of credit/power to vend.
 * @param {string} userPass The customer's password (if required by protocol).
 * @returns {object} The parsed JSON representation of the Hub's XML response.
 */
const vendSingleStep = async (meterNum, amount, userPass) => {
    if (!HUB_ENDPOINT || !TP_USERNAME || !TP_SECRET_KEY) {
        throw new Error("Missing critical environment variables (HUB_ENDPOINT, TP_USERNAME, TP_SECRET_KEY).");
    }

    // 1. Generate Required Security Data (P1.2 & P1.3 Integration)
    const transID = generateTransID();
    const hashedPassword = generateHashedPassword(TP_SECRET_KEY);
    const signature = generateSignature(transID, meterNum, hashedPassword);
    
    // We will use the fixed DONOTVERIFYDATA value for F-1.2.3
    const verifyData = 'DONOTVERIFYDATA'; 
    const action = 'PURCHASE'; 

    // 2. Construct the XML Request Body
    const xmlObject = {
        Transaction: {
            // Header Attributes
            $: {
                transID: transID,
                userName: TP_USERNAME,
                signature: signature,
                action: action,
                userPass: generateHashedPassword(userPass || TP_SECRET_KEY) // Use customer's pass or default TP_SECRET
            },
            // Transaction Details
            Property: [
                { $: { name: 'meterNum', value: meterNum } },
                { $: { name: 'amount', value: String(amount) } }, // Protocol requires amount as string
                { $: { name: 'verifyData', value: verifyData } } 
            ]
        }
    };

    const xmlPayload = xmlBuilder.buildObject(xmlObject);

    // 3. Make the HTTPS Request (NF-2.1.1)
    console.log(`Sending request ${transID} to Hub...`);
    let response;
    try {
        response = await axios.post(HUB_ENDPOINT, xmlPayload, {
            headers: {
                'Content-Type': 'text/xml'
            },
            // Use a timeout to prevent hanging connections
            timeout: 30000 
        });
    } catch (error) {
        // Axios error (network failure, timeout, non-200 status)
        throw new Error(`HTTP/Network Error connecting to Hub: ${error.message}`);
    }

    // 4. Parse the XML Response (F-1.3.1)
    let parsedResponse;
    try {
        parsedResponse = await xml2js.parseStringPromise(response.data, { explicitArray: false });
    } catch (error) {
        throw new Error(`Failed to parse XML response: ${error.message}`);
    }

    // Return the transaction data and the raw XML for logging
    return {
        transID: transID,
        requestXML: xmlPayload,
        responseXML: response.data,
        parsedData: parsedResponse.XMLPackage.Transaction
    };
};


module.exports = {
    vendSingleStep
};

