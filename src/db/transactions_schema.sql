-- Table: transactions
-- Purpose: Stores an immutable record of every request and response with the SMARTvend Hub.
-- Compliance: Fulfills NF-2.2.1 (logging all requests/responses).
CREATE TABLE transactions (
    -- Primary Identifier & Tracking
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,          -- User/TP system identifier who initiated the request

    -- Core Transaction Identifiers (Mandatory for Audit/Search)
    trans_id VARCHAR(30) UNIQUE NOT NULL,  -- The unique ID sent in the request (F-1.1.1)
    meter_num VARCHAR(20) NOT NULL,         -- The meter number involved in the transaction

    -- Request Details
    action_requested VARCHAR(10) NOT NULL,  -- e.g., 'PURCHASE', 'SEARCH', 'BALANCE'
    request_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    request_xml TEXT NOT NULL,              -- The full XML sent to the Hub

    -- Response Details (Data received from the Hub)
    response_timestamp TIMESTAMP NULL,       -- NULLABLE: Will be populated upon response
    -- Store the final status code from the Hub's XML 'state' and 'code' attributes
    hub_state INT NOT NULL,                 -- The 'state' attribute (0=Success, 1=Error)
    hub_error_code VARCHAR(10),             -- The specific error code (e.g., -10084, -30029)

    -- Vending/Token Data (Extracted for quick search/reporting)
    amount_requested DECIMAL(10, 2),        -- Amount requested (Money or Power)
    token_received VARCHAR(60),             -- Main token attribute (single or 40-digit format)
    invoice_num VARCHAR(30),                -- The invoice number returned

    -- Full Response Storage (Mandatory for comprehensive audit)
    response_xml TEXT NULL,                 -- The complete XML response received from the Hub
    
    -- Hub State Tracking: To mark a transaction as 'Pending', 'Success', or 'Failed'
    hub_status_code VARCHAR(10)
);

-- Indexing for fast search (F-1.1.3: SEARCH by transID or meterNum)
CREATE INDEX idx_trans_id ON transactions (trans_id);
CREATE INDEX idx_meter_num ON transactions (meter_num);
