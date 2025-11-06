# Wallet & Payment Routes Documentation

## Overview
The wallet and payment functionality has been properly separated:
- **Wallet Module**: View wallet balance and transaction history
- **Payment Module**: Handle Cashfree payment gateway for wallet recharge and dues payment

---

## Wallet Module Routes (`/wallet`)

### 1. Get My Wallet
- **Endpoint**: `GET /wallet/my-wallet`
- **Auth**: Customer only
- **Description**: Get authenticated customer's wallet balance and transaction history
- **Response**:
```json
{
  "availableBalance": 1000.50,
  "lastTransaction": {
    "amount": 500,
    "type": "Credit",
    "createdAt": "2025-11-06T10:30:00Z"
  },
  "All transactions using wallet": [...]
}
```

### 2. Get All Wallets
- **Endpoint**: `GET /wallet`
- **Auth**: Required (any authenticated user)
- **Description**: Get all wallets (admin/owner use)
- **Response**: Array of wallet records

---

## Payment Module Routes (`/payment`)

### 1. Create Wallet Recharge
- **Endpoint**: `POST /payment/wallet/recharge`
- **Auth**: Customer only
- **Description**: Initiate wallet recharge via Cashfree payment gateway
- **Request Body**:
```json
{
  "userId": "user_id_here",
  "amount": 500
}
```
- **Response**:
```json
{
  "payment_session_id": "session_xxx",
  "order_id": "order_xxx",
  "walletRecharge": {
    "id": "wr_xxx",
    "amount": 500,
    "paymentStatus": "Pending"
  }
}
```
- **Frontend**: Use the `payment_session_id` with Cashfree Drop Checkout SDK

### 2. Create Dues Payment
- **Endpoint**: `POST /payment/dues/payment`
- **Auth**: Customer only
- **Description**: Pay dues for one or multiple orders
- **Request Body**:
```json
{
  "userId": "user_id_here",
  "orderIds": ["order_id_1", "order_id_2"]
}
```
- **Response**:
```json
{
  "payment_session_id": "session_xxx",
  "order_id": "order_xxx",
  "duesPayment": {
    "id": "dp_xxx",
    "amount": 1200,
    "orderIds": ["order_id_1", "order_id_2"],
    "paymentStatus": "Pending"
  }
}
```
- **Validation**: 
  - All orders must belong to the user
  - All orders must have `isDues: true`
  - All orders must not be already cleared (`duesCleared: false`)

### 3. Get User Dues
- **Endpoint**: `GET /payment/dues/:userId`
- **Auth**: Customer, Owner, Driver, SuperAdmin
- **Description**: Get all active dues for a user with 3-dues limit check
- **Response**:
```json
{
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "activeDuesCount": 2,
    "totalDuesAmount": 1200
  },
  "duesOrders": [
    {
      "id": "order_1",
      "orderId": "ORD123",
      "totalAmount": 500,
      "isDues": true,
      "duesCleared": false,
      "createdAt": "2025-11-01T10:00:00Z"
    }
  ],
  "canAddMoreDues": true,
  "remainingDuesSlots": 1
}
```

### 4. Wallet Recharge Webhook
- **Endpoint**: `POST /payment/webhook/wallet-recharge`
- **Auth**: None (called by Cashfree)
- **Description**: Cashfree webhook for wallet recharge payment status
- **Headers Required**:
  - `x-webhook-signature`: HMAC signature
  - `x-webhook-timestamp`: Timestamp
- **Processing**:
  - Verifies webhook signature
  - On `PAYMENT_SUCCESS_WEBHOOK`: Credits wallet balance, creates transaction
  - Updates WalletRecharge status

### 5. Dues Payment Webhook
- **Endpoint**: `POST /payment/webhook/dues-payment`
- **Auth**: None (called by Cashfree)
- **Description**: Cashfree webhook for dues payment status
- **Headers Required**:
  - `x-webhook-signature`: HMAC signature
  - `x-webhook-timestamp`: Timestamp
- **Processing**:
  - Verifies webhook signature
  - On `PAYMENT_SUCCESS_WEBHOOK`: Clears dues for orders, decrements activeDuesCount
  - Updates DuesPayment status

---

## Payment Flow

### Wallet Recharge Flow:
1. Customer calls `POST /payment/wallet/recharge` with amount
2. Backend creates Cashfree order and WalletRecharge record
3. Frontend receives `payment_session_id`
4. Frontend opens Cashfree Drop Checkout SDK
5. Customer completes payment
6. Cashfree sends webhook to `POST /payment/webhook/wallet-recharge`
7. Backend verifies signature and credits wallet balance
8. WalletTransaction record created with type "Credit"

### Dues Payment Flow:
1. Customer/Driver calls `GET /payment/dues/:userId` to check dues
2. Customer calls `POST /payment/dues/payment` with orderIds
3. Backend validates dues orders and creates Cashfree order
4. Frontend receives `payment_session_id`
5. Frontend opens Cashfree Drop Checkout SDK
6. Customer completes payment
7. Cashfree sends webhook to `POST /payment/webhook/dues-payment`
8. Backend verifies signature and clears dues:
   - Sets `isDues: false`, `duesCleared: true`, `duesClearedAt: timestamp`
   - Decrements `user.activeDuesCount`
   - Subtracts from `user.totalDuesAmount`

---

## Important Notes

1. **No Direct Recharge**: The old `/wallet/recharge-balance` endpoint has been removed. All wallet recharges MUST go through Cashfree payment gateway.

2. **Webhook Security**: All webhook endpoints verify HMAC SHA256 signature using `x-webhook-signature` header and timestamp to prevent fraud.

3. **Dues Limit**: Users can have maximum 3 active dues. Check `canAddMoreDues` before allowing credit orders.

4. **Cashfree API Version**: All API calls use `x-api-version: 2025-01-01` header.

5. **Order Payment**: Orders themselves don't use Cashfree. Only COD/Wallet/Credit payment methods are supported for orders.
