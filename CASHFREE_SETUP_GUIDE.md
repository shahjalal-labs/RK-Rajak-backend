# Cashfree Payment Integration - Complete Setup Guide

## ✅ Changes Made

### 1. **Database Schema Updates**
Updated Prisma schema with:
- Removed unnecessary payment fields from `order` model
- Added `isDues`, `duesCleared`, `duesClearedAt` to track credit orders
- Added `activeDuesCount` and `totalDuesAmount` to User model
- Added `WalletRecharge` model for wallet top-up payments
- Added `DuesPayment` model for clearing credit dues
- Changed `PaymentMethod` enum: removed `Online`, added `Credit`

### 2. **Payment System Restructured**
- **Removed**: Payment from order placement
- **Added**: Payment for wallet recharge and dues clearing only
- Orders now support: COD, Wallet, Credit (dues)

### 3. **Dues System Features**
- Maximum 3 credit orders allowed per customer
- Delivery boys can mark deliveries as credit
- Customers can clear individual or all dues
- Payment tracking per dues clearance

## 🔧 Setup Instructions

### Step 1: Run Prisma Migration
```cmd
cd e:\Project_Porduction_Roton\RK-Rajak-ABS-Fruits
npx prisma generate
npx prisma db push
```

### Step 2: Update Environment Variables
Make sure `.env` has:
```env
CASHFREE_APP_ID=your_app_id
CASHFREE_SECRET_KEY=your_secret_key
CASHFREE_ENV=sandbox
CASHFREE_WEBHOOK_SECRET=your_webhook_secret
FRONTEND_BASE_URL=http://localhost:3000
BACKEND_BASE_URL=http://localhost:8001
```

### Step 3: Test Payment Endpoints

#### Wallet Recharge
```http
POST /api/v1/payment/wallet-recharge
Content-Type: application/json

{
  "userId": "user_id_here",
  "amount": 100
}
```

**Response:**
```json
{
  "success": true,
  "message": "Wallet recharge initiated",
  "result": {
    "paymentSessionId": "session_xxx...",
    "cashfreeOrderId": "PAY...",
    "message": "Use payment_session_id on frontend with Cashfree Checkout SDK"
  }
}
```

#### Get User Dues
```http
GET /api/v1/payment/dues/{userId}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "activeDuesCount": 2,
    "totalDuesAmount": 500.50,
    "canTakeCredit": true,
    "duesOrders": [...]
  }
}
```

#### Clear Dues
```http
POST /api/v1/payment/clear-dues
Content-Type: application/json

{
  "userId": "user_id_here",
  "orderIds": ["order_id_1", "order_id_2"],
  "amount": 500.50
}
```

### Step 4: Frontend Integration

Use Cashfree Drop Checkout on frontend:

```html
<!-- Load Cashfree SDK -->
<script src="https://sdk.cashfree.com/js/v3/cashfree.js"></script>
```

```javascript
// Initialize Cashfree
const cashfree = Cashfree({
  mode: "sandbox" // or "production"
});

// When user wants to pay
async function handlePayment(paymentSessionId, returnUrl) {
  const checkoutOptions = {
    paymentSessionId: paymentSessionId,
    returnUrl: returnUrl
  };
  
  cashfree.checkout(checkoutOptions);
}
```

### Step 5: Webhook Setup

Set up webhooks in Cashfree dashboard:
- **Wallet Recharge**: `https://your-domain.com/api/v1/payment/webhook/wallet-recharge`
- **Dues Payment**: `https://your-domain.com/api/v1/payment/webhook/dues-payment`

## 📋 Order Flow

### COD Order
1. User places order with `paymentMethod: "COD"`
2. Delivery boy delivers
3. User pays cash
4. Order marked as delivered

### Wallet Order
1. User places order with `paymentMethod: "Wallet"`
2. Wallet balance deducted immediately
3. If cancelled/returned → Wallet refunded automatically

### Credit Order (Dues)
1. User places order with `paymentMethod: "Credit"`
2. Check: `user.activeDuesCount < 3`
3. If allowed:
   - Create order with `isDues: true`
   - Increment `user.activeDuesCount`
   - Add to `user.totalDuesAmount`
4. Delivery boy marks as delivered (credit)
5. User can clear dues via payment

## 🔄 Cancel/Return Logic

```typescript
// In order.service.ts
async function cancelOrder(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }});
  
  if (order.paymentMethod === "Wallet") {
    // Refund to wallet
    await prisma.wallet.update({
      where: { userId: order.userId },
      data: { balance: { increment: order.walletAmountUsed }}
    });
    
    await prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        amount: order.walletAmountUsed,
        type: "Credit",
        description: `Refund for cancelled order ${order.orderId}`
      }
    });
  }
  
  // For COD/Credit - just cancel, no refund needed
  await prisma.order.update({
    where: { id: orderId },
    data: { status: "Cancelled" }
  });
}
```

## 🎯 Next Steps

1. Run Prisma migration (Step 1 above)
2. Update payment routes and controllers (I can help with this)
3. Update order service to handle COD/Wallet/Credit properly
4. Add dues checking in order placement
5. Add delivery boy interface to mark credit deliveries
6. Test the complete flow

Would you like me to:
1. ✅ Update order.service.ts with new payment logic?
2. ✅ Create payment routes and controllers?
3. ✅ Add delivery boy endpoints for dues marking?
4. ✅ Add cancel/return logic with wallet refunds?
