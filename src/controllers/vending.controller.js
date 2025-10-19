// Controller Layer: Exposes the secure internal REST API (P2.1)
const express = require('express');
const router = express.Router();
const { generateUniqueTransID } = require('../id_generator'); // P1.2 - PATH CORRECTED
const transactionRepo = require('../transaction_repository'); // Repository - PATH CORRECTED
const { buildXmlRequest, sendRequest } = require('../xml_protocol'); // Protocol Service - PATH CORRECTED

// Middleware (You would add Auth here later)
router.use(express.json());

/**
 * Internal REST Endpoint: POST /api/vending/purchase
 * Implements core vending logic (F-1.1.2)
 */
router.post('/purchase', async (req, res) => {
    const { meterNum, amount, calcMode, verifyData } = req.body; // verifyData can be DONOTVERIFYDATA or a code
    
    // 1. Generate unique transaction ID (P1.2)
    const transID = generateUniqueTransID();
    const userId = req.headers['x-user-id'] || 'anonymous'; // Replace with actual auth logic

    // 2. Build the XML request (P1.4)
    const xmlRequest = buildXmlRequest('PURCHASE', {
        transID, meterNum, calcMode: calcMode || 'M', amount, verifyData: verifyData || 'DONOTVERIFYDATA'
    });

    // 3. Log the initial request (P1.1.D)
    let auditId;
    try {
        auditId = await transactionRepo.createRequestLog({
            transId: transID,
            meterNum,
            actionRequested: 'PURCHASE',
            requestXml: xmlRequest,
            userId
        });
    } catch (dbError) {
        // If logging fails, abort and return internal server error
        return res.status(500).json({ success: false, message: 'Internal audit logging failed.' });
    }

    // 4. Send the request to the Hub (P1.4)
    try {
        const hubResponse = await sendRequest('PURCHASE', xmlRequest);
        const hubResult = hubResponse.result;
        const resultAttr = hubResponse.result.$; // Extract root attributes
        
        // 5. Process the response (P2.5: Token Pre-Processing will go here later)
        let tokenReceived = null;

        // **THE SYNTAX FIX IS HERE:** Safely check for the Property array before using .find()
        if (hubResult.Property && Array.isArray(hubResult.Property)) {
            const tokenElement = hubResult.Property.find(p => p.$.name === 'token');
            tokenReceived = tokenElement ? tokenElement.$.value : null;
        }
        
        const finalResponseData = {
            state: parseInt(resultAttr.state),
            code: resultAttr.code,
            token: tokenReceived,
            invoiceNum: resultAttr.invoice,
            amountRequested: amount,
            responseXml: JSON.stringify(hubResponse) // Store full JSON/XML for audit
        };

        // 6. Update audit log (P1.1.D)
        await transactionRepo.updateResponseLog(auditId, finalResponseData);
        
        // 7. Send clean, simple JSON response to the Front-End
        res.status(200).json({ 
            success: finalResponseData.state === 0, 
            transactionId: transID,
            hubCode: finalResponseData.code,
            token: finalResponseData.token, // Front-end handles presentation compliance (P3.2)
            receiptData: resultAttr
        });

    } catch (error) {
        // NF-2.2.2: Handle communication/protocol errors
        console.error('Final transaction failure:', error.message);
        res.status(500).json({ success: false, message: 'Vending failed due to Hub error or network issue.' });
    }
});

module.exports = router;

