// This is a one-time script to create your admin user
// Run this from your terminal: node registerUser.js

const db = require('./src/config/db');
const bcrypt = require('bcryptjs');

// --- SET YOUR NEW USERNAME AND PASSWORD HERE ---
const USERNAME = 'admin';
const PASSWORD = 'password123';
// ----------------------------------------------

async function registerUser() {
    console.log('Connecting to database...');
    try {
        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(PASSWORD, salt);

        console.log(`Creating user: ${USERNAME}`);
        
        // Insert into database
        await db('users').insert({
            username: USERNAME,
            password_hash: passwordHash
        });

        console.log(`Successfully created user '${USERNAME}' with password '${PASSWORD}'`);
        console.log('You can now run "npm start" and log in with these credentials.');

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            console.error(`Error: User '${USERNAME}' already exists.`);
        } else {
            console.error('Error creating user:', error.message);
        }
    } finally {
        db.destroy(); // Close the database connection
    }
}

registerUser();
