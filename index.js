const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Configure PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Use CORS middleware
app.use(cors());

// Parse JSON body
app.use(bodyParser.json());

// Create the referrals table if it doesn't exist
const createTableIfNotExists = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS referrals (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      referral_message TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await pool.query(query);
    console.log('Table created or already exists.');
  } catch (error) {
    console.error('Error creating table:', error);
  }
};

createTableIfNotExists();

// Endpoint for handling referrals
app.post('/referrals', async (req, res) => {
  const { name, email, referralMessage } = req.body;

  if (!name || !email || !referralMessage) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Insert referral into PostgreSQL
    const result = await pool.query(
      'INSERT INTO referrals (name, email, referral_message) VALUES ($1, $2, $3) RETURNING *',
      [name, email, referralMessage]
    );
    const referral = result.rows[0]; // Retrieve the newly inserted referral

    // Send email notification
    await sendReferralEmail(name, email, referralMessage);

    res.status(201).json(referral);
  } catch (error) {
    console.error('Error creating referral:', error);
    res.status(500).json({ error: 'Error creating referral' });
  }
});

// Function to send email notification
const sendReferralEmail = async (name, email, message) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'New Referral',
    text: `You have received a new referral from ${name} (${email}). Message: ${message}`,
  };

  await transporter.sendMail(mailOptions);
};

// Start server
const PORT = process.env.PORT || 4000; // Use Render's provided PORT or fallback to 4000
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Gracefully close PostgreSQL pool on server shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received termination signal, shutting down...');
  await pool.end();
  process.exit(0);
});
