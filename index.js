const express = require('express');
const bodyParser = require('body-parser');
const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');
const cors = require('cors');
require('dotenv').config(); // Use dotenv to manage environment variables

const app = express();
const prisma = new PrismaClient();
app.use(bodyParser.json());

app.use(cors());

app.post('/referrals', async (req, res) => {
  console.log("AAA", req.body);
  const { name, email, referralMessage } = req.body;

  if (!name || !email || !referralMessage) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const referral = await prisma.referral.create({
      data: {
        name,
        email,
        referralMessage,
      },
    });

    // Send email notification
    await sendReferralEmail(name, email, referralMessage);

    res.status(201).json(referral);
  } catch (error) {
    console.error('Error creating referral:', error); // Improved error logging
    res.status(500).json({ error: error });
  }
});

const sendReferralEmail = async (name, email, message) => {
  console.log(email);
  let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  let mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'New Referral',
    text: `You have received a new referral from ${name} (${email}). Message: ${message}`,
  };

  await transporter.sendMail(mailOptions);
};

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
