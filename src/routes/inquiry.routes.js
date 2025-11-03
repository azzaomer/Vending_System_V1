// F-1.1.3: Routes for the Inquiry API
const router = require('express').Router();
const inquiryController = require('../controllers/inquiry.controller');

// --- Inquiry Routes ---

/**
 * @route GET /api/v1/inquiry/search
 * @description Search for a specific transaction by ID.
 * @query {string} type - The type of ID (e.g., 'transID', 'vendID').
 * @query {string} id - The ID value to search for.
 */
router.get('/search', inquiryController.searchTransaction);

/**
 * @route GET /api/v1/inquiry/last
 * @description Get the last 5 transactions for a specific meter number.
 * @query {string} meterNum - The meter number to check.
 */
router.get('/last-transactions', inquiryController.getLastTransactions);


/**
 * @route GET /api/v1/inquiry/balance
 * @description Check the balance for a specific meter number.
 * @query {string} meterNum - The meter number to check. (Not fully implemented in controller)
 */
router.get('/balance', inquiryController.checkBalance);

// Export the router to be used in server.js
module.exports = router;

