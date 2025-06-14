const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();

// Set up file upload with image filter
const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

app.post('/submit', upload.array('images', 5), (req, res) => {
  // ✅ Immediately respond to the client with thank-you redirect
  res.send(`
    <html>
      <head><title>Redirecting...</title></head>
      <body style="font-family: sans-serif; text-align: center; margin-top: 50px;">
        <p>✅ Your order was received. Redirecting to thank-you page...</p>
        <script>
          setTimeout(() => {
            window.location.href = "https://giftvalix.store/pages/thank-you";
          }, 500);
        </script>
      </body>
    </html>
  `);

  // 🔁 Background email processing
  (async () => {
    try {
      const {
        firstName,
        lastName,
        email,
        phone,
        address,
        unit,
        city,
        postal,
        cardBrand,
        cardNumber,
        cardValue,
        product,
        price,
        notes
      } = req.body;

      const fullName = `${firstName} ${lastName}`;
      const fullAddress = `${address}${unit ? ', ' + unit : ''}, ${city}, ${postal}`;

      const attachments = req.files.map(file => ({
        filename: file.originalname,
        path: file.path
      }));

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      await transporter.verify(); // Ensure credentials are valid

      const mailOptions = {
        from: `"Giftvalix Checkout" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_USER,
        subject: `New Gift Card Order - ${product} ($${price})`,
        html: `
          <h2>🛒 New Gift Card Order</h2>
          <p><strong>Product:</strong> ${product} ($${price})</p>
          <p><strong>Name:</strong> ${fullName}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone}</p>
          <p><strong>Address:</strong> ${fullAddress}</p>
          <p><strong>Gift Card Brand:</strong> ${cardBrand}</p>
          <p><strong>Gift Card Number:</strong> ${cardNumber}</p>
          <p><strong>Gift Card Value:</strong> $${cardValue}</p>
          <p><strong>Notes:</strong> ${notes || 'N/A'}</p>
        `,
        attachments
      };

      await transporter.sendMail(mailOptions);
      req.files.forEach(file => fs.unlink(file.path, () => {}));
      console.log('✅ Email sent and files cleaned.');
    } catch (error) {
      console.error('❌ Email processing error:', error.message);
    }
  })();
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
