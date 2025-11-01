// F-1.1.1: Database configuration
// Load environment variables from .env file (like DB_HOST, DB_USER, etc.)
require('dotenv').config();

const knex = require('knex');

// Define the database connection configuration
const dbConfig = {
    client: 'mysql2', // We are using the mysql2 driver
    connection: {
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'vending_gateway_db',
    },
    pool: {
        min: 2,
        max: 10
    }
};

// Initialize Knex with the configuration
const db = knex(dbConfig);

// Test the database connection
db.raw('SELECT 1')
    .then(() => {
        console.log('Database connected successfully.');
    })
    .catch((err) => {
        console.error('Failed to connect to the database:', err);
        process.exit(1); // Exit the application if DB connection fails
    });

// Export the Knex instance to be used by our models
module.exports = db;

