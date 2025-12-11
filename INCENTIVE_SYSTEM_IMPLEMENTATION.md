# Incentive System Implementation Guide

## 🎯 Overview

A complete incentive tracking system for **Drivers** and **Agents** with automatic progress tracking, reward generation, and daily/periodic resets using cron jobs.

---

## 📋 Features Implemented

### ✅ 1. Driver Incentives (Daily Zero Returns)
- **Type**: `Zero_returns`
- **Goal**: Complete all assigned orders with 0 returns/rejections
- **Tracking**: Daily progress (resets every 24 hours)
- **Reward**: Auto-created when all orders have zero returns

### ✅ 2. Agent Incentives (Weekly/Monthly Achievement)
- **Types**: `Weekly_achievement` (7 days), `Monthly_achievement` (30 days)
- **Goal**: Achieve target sales amount within the period
- **Tracking**: Continuous tracking with periodic resets
- **Reward**: Auto-created when target amount is reached

### ✅ 3. Automatic Progress Tracking
- Driver progress auto-created when orders are assigned
- Agent progress auto-created when incentive is created
- Real-time updates on order delivery
- Automatic reward generation

### ✅ 4. Cron Jobs for Auto-Reset
- **Driver Reset**: Runs daily at 00:00 (midnight)
- **Agent Reset**: Runs daily at 00:30 (checks for expired periods)

---

## 🗂️ Database Schema Updates

### Driver Incentive Progress
```prisma
model DriverIncentiveProgress {
  id                   String   @id @default(auto()) @map("_id") @db.ObjectId
  driverId             String   @db.ObjectId
  incentiveId          String   @db.ObjectId
  totalAssignedOrders  Int      @default(0)
  completedOrders      Int      @default(0)
  zeroReturnOrders     Int      @default(0)
  hasReturns           Boolean  @default(false)
  isEligibleForReward  Boolean  @default(false)
  rewardClaimed        Boolean  @default(false)
  currentDate          String   // YYYY-MM-DD format
  updatedAt            DateTime @updatedAt
  createdAt            DateTime @default(now())

  @@unique([driverId, incentiveId, currentDate])
}
```

### Agent Incentive Progress
```prisma
model AgentIncentiveProgress {
  id               String   @id @default(auto()) @map("_id") @db.ObjectId
  agentId          String   @db.ObjectId
  incentiveId      String   @db.ObjectId
  targetAmount     Float
  currentAmount    Float    @default(0)
  startAt          DateTime
  endAt            DateTime
  isCompleted      Boolean  @default(false)
  rewardClaimed    Boolean  @default(false)
  periodType       String   // "weekly" or "monthly"
  updatedAt        DateTime @updatedAt
  createdAt        DateTime @default(now())

  @@unique([agentId, incentiveId, startAt])
}
```

---

## 🔄 System Flow

### Driver Flow (Daily Zero Returns)

1. **Order Assignment**
   ```
   Admin/Owner assigns orders to driver
   → updateDriverProgressOnAssignment() called
   → totalAssignedOrders incremented
   ```

2. **Order Delivery**
   ```
   Driver delivers order
   → updateDriverProgressOnDelivery() called
   → completedOrders incremented
   → Check if order has returns
   → If NO returns: zeroReturnOrders incremented
   → If HAS returns: hasReturns = true
   ```

3. **Reward Check**
   ```
   If all completed orders have zero returns
   → isEligibleForReward = true
   → Auto-create Reward
   → rewardClaimed = true
   ```

4. **Daily Reset (00:00)**
   ```
   Cron job runs
   → Check yesterday's progress
   → Create rewards for eligible drivers
   → New progress auto-created on next assignment
   ```

### Agent Flow (Weekly/Monthly Achievement)

1. **Incentive Created**
   ```
   Admin creates agent incentive
   → initializeAgentProgressForIncentive() called
   → Create progress for all agents in branch
   → startAt = now, endAt = now + 7/30 days
   ```

2. **Order Delivered**
   ```
   Customer (linked to agent) order delivered
   → updateAgentProgress() called
   → currentAmount += order.totalAcceptedPrice
   ```

3. **Target Achievement**
   ```
   If currentAmount >= targetAmount
   → isCompleted = true
   → Auto-create Reward
   → rewardClaimed = true
   ```

4. **Period Reset (00:30)**
   ```
   Cron job runs
   → Find expired periods (endAt < now)
   → Create rewards for completed but unclaimed
   → Create new period progress automatically
   ```

---

## 📝 API Endpoints

### CRUD Operations

#### Create Incentive
```http
POST /api/incentives
Authorization: Bearer {token}
Role: SuperAdmin, Owner

Body:
{
  "role": "Driver" | "Agent",
  "type": "Zero_returns" | "Weekly_achievement" | "Monthly_achievement",
  "targetAmount": 50000,  // Required for Agent only
  "rewardAmount": 500,
  "branchId": "branch_id"
}
```

#### Get All Incentives
```http
GET /api/incentives?branchId={branchId}
Authorization: Bearer {token}
Role: SuperAdmin, Owner
```

#### Get Incentive by ID
```http
GET /api/incentives/:id
Authorization: Bearer {token}
Role: SuperAdmin, Owner
```

#### Update Incentive
```http
PATCH /api/incentives/:id
Authorization: Bearer {token}
Role: SuperAdmin, Owner

Body: (partial update)
{
  "rewardAmount": 600,
  "targetAmount": 60000
}
```

#### Delete Incentive
```http
DELETE /api/incentives/:id
Authorization: Bearer {token}
Role: SuperAdmin, Owner
```

### Progress & Rewards

#### Get My Progress
```http
GET /api/incentives/progress/my
Authorization: Bearer {token}
Role: Any authenticated user

Response:
For Driver:
[
  {
    "id": "progress_id",
    "type": "driver",
    "totalAssignedOrders": 6,
    "completedOrders": 5,
    "zeroReturnOrders": 5,
    "hasReturns": false,
    "isEligibleForReward": false,
    "rewardClaimed": false,
    "currentDate": "2025-12-11",
    "rewardAmount": 500,
    "incentive": {...}
  }
]

For Agent:
[
  {
    "id": "progress_id",
    "type": "agent",
    "currentAmount": 35000,
    "targetAmount": 50000,
    "rewardAmount": 1000,
    "isCompleted": false,
    "rewardClaimed": false,
    "percentageComplete": 70,
    "periodType": "weekly",
    "startAt": "2025-12-08T00:00:00Z",
    "endAt": "2025-12-15T00:00:00Z",
    "incentive": {...}
  }
]
```

#### Get My Rewards
```http
GET /api/incentives/rewards/my
Authorization: Bearer {token}
Role: Any authenticated user
```

#### Get All Rewards (Admin)
```http
GET /api/incentives/rewards/all?userRole=Driver&startDate=2025-01-01&endDate=2025-12-31
Authorization: Bearer {token}
Role: SuperAdmin, Owner
```

#### Get User Progress (Admin)
```http
GET /api/incentives/progress/:userId
Authorization: Bearer {token}
Role: SuperAdmin, Owner
```

#### Get User Rewards (Admin)
```http
GET /api/incentives/rewards/:userId
Authorization: Bearer {token}
Role: SuperAdmin, Owner
```

---

## ⚙️ Configuration

### Cron Job Timezone
Located in `src/cron/incentives.cron.ts`:
```typescript
{
  timezone: "Asia/Kolkata", // Adjust to your timezone
}
```

### Cron Schedules
- **Driver Reset**: `"0 0 * * *"` (Every day at 00:00)
- **Agent Reset**: `"30 0 * * *"` (Every day at 00:30)

To change schedules, edit the cron patterns in `src/cron/incentives.cron.ts`.

---

## 🧪 Testing Scenarios

### Test Driver Incentives

1. **Create Zero Returns Incentive**
   ```
   POST /api/incentives
   {
     "role": "Driver",
     "type": "Zero_returns",
     "rewardAmount": 500,
     "branchId": "branch_id"
   }
   ```

2. **Assign Orders to Driver**
   - Assign 5 orders to driver
   - Check driver progress: `totalAssignedOrders = 5`

3. **Deliver All Orders with Zero Returns**
   - Deliver each order without any returns
   - After 5th delivery: Reward auto-created
   - Check rewards: Should see new reward entry

4. **Test with Returns**
   - Assign new orders next day
   - Deliver 1 order with returns
   - Complete rest without returns
   - Result: No reward (hasReturns = true)

### Test Agent Incentives

1. **Create Weekly Achievement Incentive**
   ```
   POST /api/incentives
   {
     "role": "Agent",
     "type": "Weekly_achievement",
     "targetAmount": 50000,
     "rewardAmount": 1000,
     "branchId": "branch_id"
   }
   ```

2. **Check Agent Progress**
   - Progress auto-created with currentAmount = 0
   - endAt = startAt + 7 days

3. **Complete Orders for Customers Linked to Agent**
   - Each delivered order adds to currentAmount
   - When currentAmount >= 50000: Reward auto-created

4. **Wait for Period End**
   - Cron job creates new period automatically
   - Old period remains for history

---

## 🛠️ Key Helper Functions

### Driver Helpers
- `getOrCreateDriverProgress(driverId, incentiveId)` - Auto-create daily progress
- `updateDriverProgressOnAssignment(driverId, orderCount)` - Track order assignment
- `updateDriverProgressOnDelivery(driverId, orderId, hasReturns)` - Track delivery
- `resetDriverProgressDaily()` - Daily reset (cron)

### Agent Helpers
- `createAgentProgressForIncentive(agentId, incentiveId, targetAmount, type)` - Create period progress
- `updateAgentProgress(agentId, amount)` - Update sales amount
- `resetAgentProgressPeriodic()` - Periodic reset (cron)

### Initialization
- `initializeDriverProgressForIncentive(incentiveId, branchId)` - Create progress for all drivers
- `initializeAgentProgressForIncentive(incentiveId, branchId, targetAmount, type)` - Create progress for all agents

---

## 📊 Admin Dashboard Queries

### View All Active Incentives
```typescript
GET /api/incentives
```

### View Driver Performance Today
```typescript
GET /api/incentives/progress/:driverId
// Shows today's progress
```

### View Agent Performance This Week/Month
```typescript
GET /api/incentives/progress/:agentId
// Shows current period progress
```

### View All Rewards This Month
```typescript
GET /api/incentives/rewards/all?startDate=2025-12-01&endDate=2025-12-31
```

---

## 🔐 Security & Validation

### Incentive Creation Validations
- ✅ Driver incentives must be `Zero_returns` type only
- ✅ Agent incentives must be `Weekly_achievement` or `Monthly_achievement`
- ✅ Agent incentives require `targetAmount`
- ✅ Only one `Refar` incentive per branch
- ✅ Only SuperAdmin/Owner can create incentives

### Progress Updates
- ✅ Auto-created on demand (no manual creation needed)
- ✅ Protected from duplicate entries with unique constraints
- ✅ Reward creation prevents duplicates

---

## 🚀 Deployment Checklist

1. ✅ Update Prisma schema
2. ⚠️ Run Prisma migration: `npx prisma migrate dev --name add-incentive-progress-fields`
3. ✅ Generate Prisma client: `npx prisma generate`
4. ✅ Ensure cron jobs start on server startup
5. ✅ Configure timezone in cron jobs
6. ✅ Test all flows in development
7. ✅ Monitor cron job execution logs

---

## 📌 Important Notes

### For Drivers
- Progress resets **every day at midnight**
- Must complete **ALL** assigned orders with zero returns to earn reward
- Even 1 order with returns = no reward for that day

### For Agents
- Progress tracks **7 days (weekly)** or **30 days (monthly)**
- Can earn reward **anytime** within period when target reached
- New period starts **automatically** after current period ends
- Old period history is **preserved**

### System Behavior
- **Incentive tracking never fails the main operation** (delivery, assignment, etc.)
- Errors in incentive tracking are logged but don't affect order processing
- Rewards are **automatically created** when conditions are met
- Progress is **auto-created** when needed (no manual intervention)

---

## 🐛 Troubleshooting

### Prisma Migration Error
If you get duplicate key errors during migration:
```bash
# Check for null referralCodes in User collection
# Option 1: Set default empty strings
# Option 2: Remove unique constraint temporarily
```

### Cron Jobs Not Running
```bash
# Check server logs for:
✅ Incentive cron jobs started successfully

# Manually test cron functions:
import { resetDriverProgressDaily, resetAgentProgressPeriodic } from './cron/incentives.cron'
await resetDriverProgressDaily()
await resetAgentProgressPeriodic()
```

### Progress Not Creating
```bash
# Check:
1. Incentive exists for that branch
2. User belongs to that branch
3. User role matches incentive role (Driver/Agent)
4. Check logs for errors
```

---

## 📞 Support

For issues or questions:
1. Check logs in server console
2. Verify database schema matches Prisma schema
3. Ensure Prisma client is regenerated after schema changes
4. Test cron jobs manually before relying on schedule

---

## 🎉 Success Indicators

✅ Driver completes all orders with 0 returns → Reward auto-created
✅ Agent reaches target amount → Reward auto-created
✅ Daily cron runs → Driver progress reset
✅ Periodic cron runs → Agent progress reset
✅ Progress auto-creates on first order/assignment
✅ No manual intervention needed

---

**Implementation Status**: ✅ Complete and Ready for Testing
