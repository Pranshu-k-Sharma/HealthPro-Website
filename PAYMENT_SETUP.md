# Payment Integration Setup Guide

## Overview
The HealthPro application now supports real-time payments through **Razorpay**, supporting both **Card payments** and **UPI** transactions.

## Features Implemented

### ✅ Payment Methods
- **Credit/Debit Cards** (Visa, Mastercard, RuPay, etc.)
- **UPI** (Google Pay, PhonePe, Paytm, etc.)
- **Net Banking**
- **Wallets**

### ✅ Features
- Real-time payment processing
- Save payment methods for future use
- Set default payment method
- View billing history
- Download invoices
- Secure payment verification
- Test mode for development

## Setup Instructions

### Step 1: Create Razorpay Account

1. Visit [https://dashboard.razorpay.com/signup](https://dashboard.razorpay.com/signup)
2. Sign up with your email
3. Complete KYC verification (for Production mode)
4. You'll start in **Test Mode** - perfect for development

### Step 2: Get API Keys

1. Log in to [Razorpay Dashboard](https://dashboard.razorpay.com)
2. Go to **Settings** → **API Keys**
3. Click **Generate Test Keys** (or use existing keys)
4. You'll see:
   - **Key ID**: `rzp_test_xxxxxxxxxxxxxx`
   - **Key Secret**: `xxxxxxxxxxxxxxxxxxxxxxxx`

⚠️ **Important**: Never commit your secret key to Git!

### Step 3: Configure Backend

1. Open `backend/.env` file
2. Add your Razorpay credentials:

```env
RAZORPAY_KEY_ID=rzp_test_your_actual_key_id_here
RAZORPAY_KEY_SECRET=your_actual_secret_key_here
```

3. Save the file
4. Restart your backend server:

```bash
cd backend
node server.js
```

### Step 4: Test the Integration

1. Navigate to **Payment Options** page in your app
2. Click **"Add Payment"**
3. Choose **Card** or **UPI**
4. Fill in the test payment details
5. Enter a test amount (e.g., ₹100)
6. Click **"Make Test Payment"**

### Test Payment Methods

#### Test Card Details (Test Mode Only)
```
Card Number: 4111 1111 1111 1111
Expiry: Any future date (e.g., 12/25)
CVV: Any 3 digits (e.g., 123)
Name: Any name
```

#### Test UPI IDs (Test Mode Only)
```
success@razorpay
failure@razorpay
```

## How It Works

### Payment Flow

1. **User initiates payment** → Click "Make Test Payment"
2. **Backend creates order** → `/api/payments/create-order`
3. **Razorpay Checkout opens** → User enters payment details
4. **Payment processed** → Razorpay handles the transaction
5. **Payment verified** → `/api/payments/verify-payment`
6. **Payment method saved** → Stored for future use
7. **Billing history updated** → Transaction recorded

### Security

- ✅ **SSL/TLS Encryption** - All data transmitted securely
- ✅ **Payment Signature Verification** - Prevents tampering
- ✅ **PCI DSS Compliant** - Razorpay is certified
- ✅ **No card storage** - Card details never touch your server
- ✅ **Webhook verification** - For server-to-server callbacks

## API Endpoints

### Payment Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/payments/create-order` | POST | Create a Razorpay order |
| `/api/payments/verify-payment` | POST | Verify payment signature |
| `/api/payments/methods` | GET | Get saved payment methods |
| `/api/payments/methods` | POST | Save payment method |
| `/api/payments/methods/:id` | DELETE | Delete payment method |
| `/api/payments/methods/:id/default` | PUT | Set default method |
| `/api/payments/history` | GET | Get billing history |
| `/api/payments/invoice/:id` | GET | Get invoice details |

## Going to Production

### 1. Complete KYC
- Submit business documents on Razorpay dashboard
- Wait for approval (usually 24-48 hours)

### 2. Switch to Live Mode
1. Generate **Live API Keys** from dashboard
2. Update `.env` with live keys:
```env
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=live_secret_key_here
```

### 3. Enable Webhooks (Optional)
1. Go to **Settings** → **Webhooks** in Razorpay
2. Add your webhook URL: `https://yourdomain.com/api/payments/webhook`
3. Select events to listen to
4. Save the webhook secret in `.env`

## Troubleshooting

### Common Issues

**1. "Payment gateway not configured" error**
- Check if `RAZORPAY_KEY_ID` is set in `.env`
- Make sure you've restarted the backend after adding keys

**2. Payment fails immediately**
- Verify your API keys are correct
- Check if you're using Test mode keys with test card details
- Look at browser console for errors

**3. "Invalid signature" error**
- Ensure `RAZORPAY_KEY_SECRET` matches your dashboard
- Check if the secret has any extra spaces

**4. Razorpay checkout doesn't open**
- Make sure Razorpay script is loaded
- Check browser console for script loading errors
- Verify your internet connection

### Debug Mode

Enable detailed logging by setting in `.env`:
```env
NODE_ENV=development
```

## Support

### Razorpay Documentation
- [API Docs](https://razorpay.com/docs/api/)
- [Payment Gateway](https://razorpay.com/docs/payment-gateway/)
- [Test Cards](https://razorpay.com/docs/payments/payments/test-card-details/)

### Contact
For issues with the integration, check:
1. Backend server logs
2. Browser console
3. Razorpay Dashboard → Payments section

## Cost

### Razorpay Pricing
- **Test Mode**: FREE
- **Production**: 
  - Domestic payments: 2% per transaction
  - International: 3% per transaction
  - No setup fees or annual fees

Check [Razorpay Pricing](https://razorpay.com/pricing/) for latest rates.

---

**Last Updated**: March 6, 2026
