# Incentives & Rewards System

A comprehensive incentive tracking and reward distribution system for sales agents, drivers, and customers.

## Features

- ✅ Multiple incentive types (Referral, Zero Returns, Weekly, Monthly)
- ✅ Automatic progress tracking
- ✅ Reward creation when targets are met
- ✅ User progress monitoring
- ✅ Leaderboard functionality
- ✅ Admin management APIs

## Incentive Types

### 1. Referral (`Refar`)
- **Purpose**: Reward users for referring new customers
- **Tracking**: No progress tracking needed
- **Reward**: Instant reward when referral is successful
- **Use Case**: One customer refar more customer

### 2. Zero Returns (`Zero_returns`)
- **Purpose**: Encourage quality service with no product returns
- **Tracking**: Count of orders with zero returns
- **Target**: Number of successful deliveries without returns
- **Use Case**: Driver completes per day deliveries with no returns, earns reward

### 3. Weekly Achievement (`Weekly_achievement`)
- **Purpose**: Weekly sales/delivery targets
- **Tracking**: Cumulative amount in the current week
- **Target**: Total sales/delivery amount for the week
- **Reset**: Every week (use cron job)
- **Use Case**: Agent achieves ₹50,000 in sales this week, earns bonus

### 4. Monthly Achievement (`Monthly_achievement`)
- **Purpose**: Monthly sales/delivery targets
- **Tracking**: Cumulative amount in the current month
- **Target**: Total sales/delivery amount for the month
- **Reset**: Every month (use cron job)
- **Use Case**: Agent completes ₹200,000 worth of deliveries in a month, earns bonus

## API Endpoints

### Admin Endpoints

#### 1. Create Incentive
```http
POST /api/v1/incentives
Authorization: Bearer <token> (SuperAdmin/Owner)

Body:
{
  "role": "Agent",
  "type": "Weekly_achievement",
  "targetAmount": 50000,
  "rewardAmount": 5000,
  "branchId": "optional_branch_id"
}
```

#### 2. Get All Incentives
```http
GET /api/v1/incentives?role=Agent&type=Weekly_achievement&branchId=xxx
Authorization: Bearer <token> (SuperAdmin/Owner)
```

#### 3. Get Incentive by ID
```http
GET /api/v1/incentives/:id
Authorization: Bearer <token> (SuperAdmin/Owner)
```

#### 4. Update Incentive
```http
PATCH /api/v1/incentives/:id
Authorization: Bearer <token> (SuperAdmin/Owner)

Body:
{
  "targetAmount": 60000,
  "rewardAmount": 6000
}
```

#### 5. Delete Incentive
```http
DELETE /api/v1/incentives/:id
Authorization: Bearer <token> (SuperAdmin/Owner)
```

#### 6. Update User Progress (Manual)
```http
POST /api/v1/incentives/progress/update
Authorization: Bearer <token> (SuperAdmin/Owner)

Body:
{
  "userId": "user_id_here",
  "incentiveId": "incentive_id_here",
  "incrementAmount": 5000
}

Response:
{
  "success": true,
  "message": "Progress updated and reward earned!",
  "data": {
    "progress": {
      "id": "progress_id",
      "userId": "user_id",
      "incentiveId": "incentive_id",
      "currentAmount": 50000,
      "completed": true
    },
    "rewardCreated": true,
    "reward": {
      "id": "reward_id",
      "amount": 5000,
      "achievedAt": "2025-12-10T10:30:00Z"
    }
  }
}
```

#### 7. Create Referral Reward
```http
POST /api/v1/incentives/rewards/referral
Authorization: Bearer <token> (SuperAdmin/Owner)

Body:
{
  "userId": "referrer_user_id",
  "incentiveId": "referral_incentive_id"
}
```

#### 8. Get All Rewards
```http
GET /api/v1/incentives/rewards/all?userId=xxx&startDate=2025-01-01&endDate=2025-12-31
Authorization: Bearer <token> (SuperAdmin/Owner)
```

#### 9. Get User's Progress
```http
GET /api/v1/incentives/progress/:userId
Authorization: Bearer <token> (SuperAdmin/Owner)
```

#### 10. Get User's Rewards
```http
GET /api/v1/incentives/rewards/:userId
Authorization: Bearer <token> (SuperAdmin/Owner)
```

### User Endpoints

#### 1. Get My Progress
```http
GET /api/v1/incentives/progress/my
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": [
    {
      "id": "progress_id",
      "currentAmount": 35000,
      "targetAmount": 50000,
      "rewardAmount": 5000,
      "completed": false,
      "percentageComplete": 70,
      "incentive": {
        "id": "incentive_id",
        "type": "Weekly_achievement",
        "role": "Agent",
        "branch": {...}
      }
    }
  ]
}
```

#### 2. Get My Rewards
```http
GET /api/v1/incentives/rewards/my
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": [
    {
      "id": "reward_id",
      "amount": 5000,
      "achievedAt": "2025-12-05T14:30:00Z",
      "incentive": {
        "id": "incentive_id",
        "type": "Weekly_achievement",
        "role": "Agent",
        "targetAmount": 50000
      }
    }
  ]
}
```

## Integration Guide

### 1. Track Order Completion

Add to your order delivery service:

```typescript
import { trackOrderCompletion, trackZeroReturns } from "../incentives/incentives.helper";

// When order is marked as delivered
const markOrderAsDelivered = async (orderId: string, driverId: string) => {
  // ... your existing code ...
  
  const order = await prisma.dailyOrder.findUnique({
    where: { id: orderId },
    include: { user: true }
  });
  
  // Track completion for agent (if order has agent)
  if (order.user?.agentId) {
    await trackOrderCompletion(
      order.user.agentId,
      order.totalAcceptedPrice || 0,
      UserRole.Agent,
      order.branchId || undefined
    );
  }
  
  // Track completion for driver
  await trackOrderCompletion(
    driverId,
    order.totalAcceptedPrice || 0,
    UserRole.Driver,
    order.branchId || undefined
  );
  
  // Track zero returns
  const hadReturns = (order.totalReturnedWeight || 0) > 0;
  
  if (order.user?.agentId) {
    await trackZeroReturns(
      order.user.agentId,
      hadReturns,
      UserRole.Agent,
      order.branchId || undefined
    );
  }
  
  await trackZeroReturns(
    driverId,
    hadReturns,
    UserRole.Driver,
    order.branchId || undefined
  );
};
```

### 2. Handle Referrals

Add to your user registration service:

```typescript
import { handleReferralReward } from "../incentives/incentives.helper";

// When a new user signs up with a referral code
const buyerOtpLogin = async (phone: string, otp: string, referralCode?: string) => {
  // ... your existing code ...
  
  if (referralCode) {
    const referrer = await prisma.user.findFirst({
      where: { referralCode: referralCode }
    });
    
    if (referrer) {
      // Create referral usage record
      await prisma.reffaralUsages.create({
        data: {
          userId: referrer.id,
          usedBy: newUser.id,
        },
      });
      
      // Handle referral reward
      await handleReferralReward(referrer.id, referrer.branchId || undefined);
    }
  }
};
```

### 3. Setup Cron Jobs

Add to your cron job configuration:

```typescript
import cron from "node-cron";
import { resetWeeklyProgress, resetMonthlyProgress } from "./modules/incentives/incentives.helper";

// Reset weekly progress every Monday at 00:00
cron.schedule("0 0 * * 1", async () => {
  console.log("Resetting weekly incentive progress...");
  await resetWeeklyProgress();
});

// Reset monthly progress on the 1st of every month at 00:00
cron.schedule("0 0 1 * *", async () => {
  console.log("Resetting monthly incentive progress...");
  await resetMonthlyProgress();
});
```

## Example Scenarios

### Scenario 1: Weekly Sales Incentive for Agents

**Setup:**
```json
{
  "role": "Agent",
  "type": "Weekly_achievement",
  "targetAmount": 50000,
  "rewardAmount": 5000,
  "branchId": "branch_123"
}
```

**Flow:**
1. Agent makes sales throughout the week
2. Each delivered order automatically updates their progress
3. When they reach ₹50,000 in sales, reward is auto-created
4. Every Monday, incomplete progress resets for new week

### Scenario 2: Zero Returns for Drivers

**Setup:**
```json
{
  "role": "Driver",
  "type": "Zero_returns",
  "targetAmount": 20,
  "rewardAmount": 2000
}
```

**Flow:**
1. Driver delivers orders
2. Each delivery with 0 returns increments progress by 1
3. After 20 successful deliveries with no returns, reward is created
4. Progress continues for next cycle

### Scenario 3: Referral Rewards

**Setup:**
```json
{
  "role": "Customer",
  "type": "Refar",
  "targetAmount": 0,
  "rewardAmount": 500
}
```

**Flow:**
1. Customer shares referral code
2. New user signs up with the code
3. Instant reward of ₹500 is created for referrer
4. No progress tracking needed

## Database Schema

```prisma
model Incentive {
  id           String        @id
  role         UserRole
  type         IncentiveType
  targetAmount Float
  rewardAmount Float
  branchId     String?
  rewards      Reward[]
  progresses   IncentiveProgress[]
}

model IncentiveProgress {
  id            String   @id
  userId        String
  incentiveId   String
  currentAmount Float    @default(0)
  completed     Boolean  @default(false)
  user          User
  incentive     Incentive
}

model Reward {
  id          String   @id
  userId      String
  incentiveId String
  amount      Float
  achievedAt  DateTime
  user        User
  incentive   Incentive
}
```

## Best Practices

1. **Always use transactions** when updating progress and creating rewards
2. **Handle errors gracefully** - don't break order flow if incentive tracking fails
3. **Set up cron jobs** for weekly and monthly resets
4. **Monitor progress** regularly to ensure accurate tracking
5. **Test thoroughly** before deploying to production
6. **Configure incentives per branch** for better control

## Testing

```typescript
// Test updating progress
const result = await incentivesServices.updateIncentiveProgress({
  userId: "test_user_id",
  incentiveId: "test_incentive_id",
  incrementAmount: 10000
});

console.log(result.rewardCreated); // false if not completed
console.log(result.progress.currentAmount); // 10000

// Test again to complete
const result2 = await incentivesServices.updateIncentiveProgress({
  userId: "test_user_id",
  incentiveId: "test_incentive_id",
  incrementAmount: 40000
});

console.log(result2.rewardCreated); // true
console.log(result2.reward?.amount); // reward amount
```

## Support

For issues or questions, contact the development team.
