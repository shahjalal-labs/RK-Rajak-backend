# Order Dispatch System Redesign

## Overview
Redesigned the order placement and dispatch system to use `mainOrderProduct` model for simplified dispatch tracking. This aggregates orders by product and date, making dispatch management much easier.

## Changes Made

### 1. New Helper Function: `createOrUpdateMainOrderProduct`
**Location:** `src/app/modules/order/order.service.ts`

This function automatically creates or updates `mainOrderProduct` records when orders are placed:
- Aggregates orders by `productId` and `orderDate`
- Tracks `totalOrders` count
- Calculates `totalWeight` from product variations
- Maintains array of `orderIds` (mainOrderId references)
- Sets status to "Pending"

### 2. Updated Order Placement Functions
**Modified functions:**
- `placeOrderCOD` - Creates mainOrderProduct after order placement
- `placeOrderWallet` - Creates mainOrderProduct after order placement  
- `createOrderByAgentForCustomer` - Creates mainOrderProduct after order placement

**How it works:**
```typescript
// After creating order and main order
await createOrUpdateMainOrderProduct(
  products,
  mainOrder.id,
  order.createdAt,
  tx
);
```

### 3. Redesigned Dispatch View: `getAllDispatchOrdersByBranchId`
**Location:** `src/app/modules/order/order.service.ts`

**Old approach:** Queried MainOrder → orders → products (complex aggregation)

**New approach:** Directly queries `mainOrderProduct` with filters:
- Filters by branch (via product.branchId)
- Filters by date range
- Optional category filter
- Only shows "Pending" status dispatches

**Response format:**
```typescript
{
  id: string;
  productId: string;
  productName: string;
  categoryId: string;
  categoryName: string;
  totalOrders: number; // Count of orders containing this product
  totalWeight: number; // Total weight in kg
  orderIds: string[]; // Array of mainOrderIds
  status: "Pending" | "Completed" | "Cancelled";
  orderDate: Date;
  variations: ProductVariation[];
}
```

### 4. Accept MainOrder Functionality
**New function:** `acceptMainOrders`
**Endpoint:** `PUT /api/v1/orders/main/accept-orders/:mainOrderId`
**Auth:** Owner, SuperAdmin

**Actions:**
1. Validates MainOrder exists and is in "Pending" status
2. Updates MainOrder status to "Processing"
3. Sets `confirmedBy` field with user role
4. Updates all linked orders to "Processing" status

### 5. Reject/Cancel MainOrder Functionality
**New function:** `rejectMainOrders`
**Endpoint:** `PUT /api/v1/orders/main/reject-orders/:mainOrderId`
**Auth:** Owner, SuperAdmin

**Actions (with cascading updates):**
1. Validates MainOrder exists and is not already cancelled
2. Updates MainOrder status to "Cancelled"
3. Sets `canceledBy` field with user role
4. Updates all linked orders to "Cancelled" status
5. **Recalculates mainOrderProduct records:**
   - Decrements `totalOrders` count
   - Subtracts weight from `totalWeight`
   - Removes mainOrderId from `orderIds` array
   - If no more orders remain, sets status to "Cancelled"

## Database Schema

### mainOrderProduct Model
```prisma
model mainOrderProduct {
  id           String                   @id @default(auto()) @map("_id") @db.ObjectId
  productId    String                   @db.ObjectId
  product      product?                 @relation(fields: [productId], references: [id])
  totalOrders  Int                      // Count of orders
  totalWeight  Float                    // Total weight in kg
  orderIds     String[]                 // Array of mainOrderIds
  orderDate    DateTime                 // Date for grouping
  status       mainOrderProductsStatus  @default(Pending)
  createdAt    DateTime                 @default(now())
  updatedAt    DateTime                 @updatedAt

  @@unique([productId, orderDate]) // One record per product per day
  @@map("mainOrderProducts")
}

enum mainOrderProductsStatus {
  Pending
  Completed
  Cancelled
}
```

### MainOrderStatus Enum
```prisma
enum MainOrderStatus {
  Pending
  Processing
  onTheway
  Delivered
  Cancelled
  deliveredWithPartiallyCancelled
  deliveredWithPartiallyReturned
  FullyReturned
}
```

## API Endpoints

### Get Dispatch Orders (Updated)
```
GET /api/v1/orders/all-dispatch/for-admin/:branchId
Auth: Admin
Query params:
  - dateTime (optional): Date to filter (default: today)
  - categoryId (optional): Filter by category
```

### Accept Main Order (New)
```
PUT /api/v1/orders/main/accept-orders/:mainOrderId
Auth: Owner, SuperAdmin
Response: Updated MainOrder with status "Processing"
```

### Reject Main Order (New)
```
PUT /api/v1/orders/main/reject-orders/:mainOrderId
Auth: Owner, SuperAdmin
Response: Updated MainOrder with status "Cancelled"
```

## Benefits

1. **Simplified Dispatch View**: Instead of complex aggregation queries, directly query `mainOrderProduct` for dispatch dashboard
2. **Real-time Aggregation**: Product totals automatically update as orders are placed
3. **Easy Cancellation Tracking**: When orders are cancelled, weights and counts automatically recalculate
4. **Date-based Grouping**: Each product gets one record per day for easy daily dispatch planning
5. **Performance**: Direct queries on mainOrderProduct are faster than aggregating from order products
6. **Accurate Weight Tracking**: Uses product variation weights for precise dispatch planning

## Example Flow

### Order Placement:
1. Customer places order with 2kg apples, 3kg oranges
2. `placeOrderCOD` creates Order and MainOrder
3. `createOrUpdateMainOrderProduct` is called:
   - Checks if apples already exist for today → Updates totalOrders +1, totalWeight +2
   - Checks if oranges already exist for today → Creates new record with totalOrders=1, totalWeight=3
   - Appends mainOrderId to both records' orderIds array

### Dispatch View:
1. Admin opens dispatch dashboard for Branch A
2. System queries mainOrderProduct filtered by:
   - product.branchId = Branch A
   - orderDate = today
   - status = "Pending"
3. Returns aggregated list showing:
   - Apples: 15 orders, 45kg total
   - Oranges: 8 orders, 24kg total
   - etc.

### Order Rejection:
1. Owner rejects a MainOrder containing 2kg apples, 3kg oranges
2. `rejectMainOrders` updates:
   - MainOrder status → "Cancelled"
   - All linked orders → "Cancelled"
   - Apples mainOrderProduct: totalOrders -1, totalWeight -2kg
   - Oranges mainOrderProduct: totalOrders -1, totalWeight -3kg
   - Removes mainOrderId from orderIds arrays

## Testing Checklist

- [ ] Place COD order → Verify mainOrderProduct created
- [ ] Place Wallet order → Verify mainOrderProduct created
- [ ] Place multiple orders with same product → Verify totalOrders and totalWeight aggregate correctly
- [ ] View dispatch dashboard → Verify aggregated data displays correctly
- [ ] Filter by category → Verify only products in that category show
- [ ] Filter by date → Verify only orders for that date show
- [ ] Accept MainOrder → Verify status changes to Processing
- [ ] Reject MainOrder → Verify cascading cancellation and weight recalculation
- [ ] Reject order that's the only one for a product → Verify mainOrderProduct status becomes "Cancelled"

## Migration Notes

**No migration needed!** The `mainOrderProduct` table already exists in the schema. The system will start populating it automatically with new orders.

For existing orders (historical data), you may want to run a one-time migration script to populate mainOrderProduct records from existing orders.
