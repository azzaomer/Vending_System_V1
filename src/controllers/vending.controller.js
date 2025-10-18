/**
 * P2.1: Vending Controller
 * * Express Router responsible for handling all HTTP requests related to vending,
 * * validation, and calling the core Protocol Service.
 * * Implements F-1.1.2 (PURCHASE).
 */

const router = require('express').Router();
const { vendSingleStep } = require('../services/protocol.service');
const { logRequest, updateResponse } = require('../repositories/transaction.repository');

/**
 * POST /api/v1/vending/purchase-single
 * Handles the single-step vending process (F-1.2.3).
 * Accepts: meterNum, amount, and an optional userId (for logging).
 */
router.post('/purchase-single', async (req, res) => {
    // These are the inputs from the Third Party POS/Web app
    const { meterNum, amount, userId } = req.body; 

    // --- 1. Basic Input Validation ---
    if (!meterNum || !amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        return res.status(400).json({ 
            error: 'Input Error', 
            message: 'Meter number and a positive amount are required.' 
        });
    }

    // --- 2. Transaction Execution ---
    let transactionResult;
    let transID; // Will be set by the Protocol Service
    let requestXML; // Will be set by the Protocol Service

    try {
        // The Protocol Service handles all security, XML, and HTTPS communication.
        transactionResult = await vendSingleStep(meterNum, amount);
        
        transID = transactionResult.transID;
        requestXML = transactionResult.requestXML;
        const responseXML = transactionResult.responseXML;
        const parsedData = transactionResult.parsedData;
        
        // --- 3. Audit Logging (Update Response) ---
        // Check if the transaction was successful (Hub specific logic, usually 0 or 1)
        const hubState = parsedData.$.state === '0' ? 0 : parsedData.$.state; 
        const hubErrorCode = parsedData.$.state !== '0' ? parsedData.$.state : null;

        // Extract key data fields from the XML response
        const tokenReceived = parsedData.Property.find(p => p.$.name === 'token')?.$.value;
        const invoiceNum = parsedData.Property.find(p => p.$.name === 'invoiceNum')?.$.value;

        // Note: The logRequest call would typically happen BEFORE vendSingleStep
        // but for a clean start, we rely on ProtocolService to internally handle P1.1.D calls
        
        await updateResponse(transID, {
            hubState: hubState,
            hubErrorCode: hubErrorCode,
            tokenReceived: tokenReceived,
            amountRequested: amount,
            invoiceNum: invoiceNum,
            responseXML: responseXML
        });

        // --- 4. Final Response to Client ---
        if (hubState === 0) {
            res.status(200).json({
                status: 'success',
                transID: transID,
                token: tokenReceived, // F-1.3.1
                invoice: invoiceNum,
                details: parsedData // Full details for the consuming application
            });
        } else {
             // NF-2.2.2: Provide user-friendly error details here (mapping required)
            res.status(502).json({
                status: 'failed',
                transID: transID,
                errorCode: hubErrorCode,
                message: `Hub Error: ${hubErrorCode}. Consult documentation for details.`
            });
        }

    } catch (error) {
        // Handle critical errors (network failure, XML parsing failure, missing credentials)
        console.error(`CRITICAL FAILURE for ${meterNum}:`, error.message);
        
        // Respond to the client with a generic 500 error for critical system failures
        res.status(500).json({
            error: 'System Error',
            message: `Gateway failed to process the request. ${error.message}`
        });
    }
});


module.exports = router;

