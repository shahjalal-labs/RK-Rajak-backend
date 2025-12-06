# Wallet Recharge Page

## 🎯 Purpose
This HTML page provides a user-friendly interface for customers to recharge their wallet using the Cashfree payment gateway.

## ⚠️ IMPORTANT: How to Access

### ✅ Recommended Method (Through Backend Server)
```bash
# 1. Start your backend server
bun run dev

# 2. Open in browser
http://localhost:3000/
```

### ⚡ Alternative Method (Live Server/Direct File Access)
If you're using VS Code Live Server or opening the HTML file directly:

1. **Update the backend port** in `index.html`:
   ```javascript
   // Line ~308 in index.html
   const BACKEND_PORT = 3000; // Change to your actual backend port
   ```

2. **Ensure backend is running**:
   ```bash
   bun run dev
   ```

3. The page will automatically test the connection and show status

## 🌐 Access URLs
- **Through Backend**: `http://localhost:3000/` (recommended)
- **Direct HTML**: `http://localhost:3000/public/index.html`
- **Live Server**: `http://127.0.0.1:5500/public/index.html` (requires CORS)

## 🔑 How to Use

### 1. Get Authentication Token
First, you need to login and get your JWT token:

**Login Endpoint**: `POST /api/v1/auth/login`

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "your_phone_number",
    "password": "your_password"
  }'
```

**Response**:
```json
{
  "success": true,
  "message": "User login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": { ... }
  }
}
```

Copy the `accessToken` value.

### 2. Use the Recharge Page

1. Open the page in your browser: `http://localhost:3000/`
2. Paste your JWT token in the "Authentication Token" field
3. Enter the amount you want to recharge OR click one of the quick amount buttons
4. Click "Proceed to Payment"
5. You'll be redirected to the Cashfree payment page
6. Complete the payment

## 📋 Features

### ✨ Quick Amount Selection
- Pre-defined amounts: ₹100, ₹500, ₹1000, ₹2000, ₹5000, ₹10000
- Click any button to auto-fill the amount

### 🔐 Token Management
- Token is automatically saved to localStorage
- No need to enter it again on subsequent visits
- Token status indicator shows if token is saved

### 🎨 User Experience
- Beautiful gradient design
- Responsive layout (works on mobile & desktop)
- Loading spinner during API calls
- Success/Error alerts with clear messages
- Input validation before submission

### ⌨️ Keyboard Shortcuts
- Press `Escape` to clear the form

## 🔧 Technical Details

### API Endpoint
- **Method**: POST
- **URL**: `/api/v1/payment/wallet/recharge`
- **Headers**: 
  - `Content-Type: application/json`
  - `Authorization: Bearer {token}`
- **Body**: 
  ```json
  {
    "amount": 1000
  }
  ```

### Response Format
**Success**:
```json
{
  "success": true,
  "message": "Wallet recharge initiated successfully",
  "data": "https://sandbox.cashfree.com/pgbillpayuiapi/order/pay?order_token=..."
}
```

**Error**:
```json
{
  "success": false,
  "message": "Error message here"
}
```

## 🔍 Troubleshooting

### "Token Required" Error
- Make sure you've entered your JWT token
- Token should start with "eyJ"
- Get a fresh token by logging in again

### "Invalid Amount" Error
- Amount must be greater than 0
- Use whole numbers (integers)
- No special characters

### "Network Error"
- Check if the backend server is running
- Verify the API base URL is correct
- Check browser console for detailed errors

### Payment Link Not Opening
- Check browser console for the payment link
- Ensure the Cashfree API is properly configured
- Verify the `payment_session_id` is returned from the API

## 🧪 Testing

### Using cURL
```bash
# Get your token first from login
TOKEN="your_jwt_token_here"

# Make recharge request
curl -X POST http://localhost:3000/api/v1/payment/wallet/recharge \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"amount": 100}'
```

### Using Postman
1. Create a new POST request
2. URL: `http://localhost:3000/api/v1/payment/wallet/recharge`
3. Headers:
   - `Content-Type`: `application/json`
   - `Authorization`: `Bearer {your_token}`
4. Body (raw JSON):
   ```json
   {
     "amount": 100
   }
   ```

## 📦 File Structure
```
public/
├── index.html          # Main recharge page
└── README.md          # This documentation
```

## 🚀 Deployment Notes

When deploying to production:
1. Update the `API_BASE_URL` in the HTML if needed
2. Ensure CORS is configured to allow frontend domain
3. Use HTTPS for secure token transmission
4. Consider implementing rate limiting
5. Add Google Analytics or monitoring

## 🔒 Security Notes

- JWT tokens are stored in localStorage (consider sessionStorage for better security)
- Tokens are sent via HTTPS in production
- Never share your JWT token with others
- Token expires based on backend configuration
- Input validation prevents XSS attacks

## 📞 Support

For issues or questions:
- Check the browser console for error messages
- Verify backend logs for API errors
- Ensure Cashfree credentials are properly configured
- Contact development team with error details
