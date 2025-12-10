# Integration Example

## How to Integrate Incentives into Your Order System

### Step 1: Import Helper Functions

Add to your order service file:

```typescript
import {
  trackOrderCompletion,
  trackZeroReturns,
} from "../incentives/incentives.helper";
import { UserRole } from "@prisma/client";
```

### Step 2: Update Order Delivery Function

Find your `markOrderAsDelivered` function in `order.service.ts` and add the tracking:

```typescript
const markOrderAsDelivered = async (
  orderId: string,
  driverId: string,
  payload: MarkOrderAsDeliveredPayload,
  deliveryProof?: Express.Multer.File
) => {
  // ... your existing delivery logic ...

  // After successfully marking order as delivered:
  const order = await prisma.dailyOrder.findUnique({
    where: { id: orderId },
    include: {
      user: {
        select: {
          id: true,
          agentId: true,
        },
      },
    },
  });

  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, "Order not found");
  }

  // Calculate if there were returns
  const hadReturns = (order.totalReturnedWeight || 0) > 0;

  // Track for Agent (if customer has an agent)
  if (order.user?.agentId) {
    try {
      // Track order completion for weekly/monthly achievements
      await trackOrderCompletion(
        order.user.agentId,
        order.totalAcceptedPrice || 0,
        UserRole.Agent,
        order.branchId || undefined
      );

      // Track zero returns achievement
      await trackZeroReturns(
        order.user.agentId,
        hadReturns,
        UserRole.Agent,
        order.branchId || undefined
      );
    } catch (error) {
      console.error("Error tracking agent incentives:", error);
      // Don't throw - continue with order processing
    }
  }

  // Track for Driver
  try {
    // Track order completion for weekly/monthly achievements
    await trackOrderCompletion(
      driverId,
      order.totalAcceptedPrice || 0,
      UserRole.Driver,
      order.branchId || undefined
    );

    // Track zero returns achievement
    await trackZeroReturns(
      driverId,
      hadReturns,
      UserRole.Driver,
      order.branchId || undefined
    );
  } catch (error) {
    console.error("Error tracking driver incentives:", error);
    // Don't throw - continue with order processing
  }

  return updatedOrder;
};
```

### Step 3: Update User Registration for Referrals

Find your user registration function in `user.service.ts`:

```typescript
import { handleReferralReward } from "../incentives/incentives.helper";

const buyerOtpLogin = async (
  phone: string,
  otp: string,
  fcmToken?: string,
  referralCode?: string
) => {
  // ... your existing OTP verification logic ...

  // After creating the new user:
  if (referralCode) {
    const referrer = await prisma.user.findFirst({
      where: { referralCode: referralCode },
    });

    if (referrer) {
      // Create referral usage record (your existing code)
      await prisma.reffaralUsages.create({
        data: {
          userId: referrer.id,
          usedBy: newUser.id,
        },
      });

      // Handle referral reward
      try {
        await handleReferralReward(
          referrer.id,
          referrer.branchId || undefined
        );
      } catch (error) {
        console.error("Error creating referral reward:", error);
        // Don't throw - user registration should still succeed
      }
    }
  }

  return { accessToken, id: user.id, role: user.role };
};
```

### Step 4: Setup Cron Jobs (Optional but Recommended)

Create a new file `src/cron/incentives.cron.ts`:

```typescript
import cron from "node-cron";
import {
  resetWeeklyProgress,
  resetMonthlyProgress,
} from "../app/modules/incentives/incentives.helper";

// Reset weekly progress every Monday at 00:00 (midnight)
export const weeklyProgressResetCron = cron.schedule("0 0 * * 1", async () => {
  console.log("Starting weekly incentive progress reset...");
  try {
    await resetWeeklyProgress();
    console.log("Weekly progress reset completed successfully");
  } catch (error) {
    console.error("Error resetting weekly progress:", error);
  }
});

// Reset monthly progress on the 1st of every month at 00:00
export const monthlyProgressResetCron = cron.schedule("0 0 1 * *", async () => {
  console.log("Starting monthly incentive progress reset...");
  try {
    await resetMonthlyProgress();
    console.log("Monthly progress reset completed successfully");
  } catch (error) {
    console.error("Error resetting monthly progress:", error);
  }
});

console.log("Incentive cron jobs initialized");
```

Then in your `server.ts` or `app.ts`:

```typescript
import "./cron/incentives.cron";
```

## Testing the Integration

### 1. Create Test Incentives

```bash
# Create Weekly Achievement for Agents
POST http://localhost:5000/api/v1/incentives
{
  "role": "Agent",
  "type": "Weekly_achievement",
  "targetAmount": 50000,
  "rewardAmount": 5000
}

# Create Zero Returns for Drivers
POST http://localhost:5000/api/v1/incentives
{
  "role": "Driver",
  "type": "Zero_returns",
  "targetAmount": 10,
  "rewardAmount": 1000
}

# Create Referral Reward
POST http://localhost:5000/api/v1/incentives
{
  "role": "Customer",
  "type": "Refar",
  "targetAmount": 0,
  "rewardAmount": 500
}
```

### 2. Test Order Delivery

```bash
# Mark an order as delivered (your existing endpoint)
# This should automatically track incentives
PATCH http://localhost:5000/api/v1/order/mark-delivered/:orderId
```

### 3. Check Progress

```bash
# Check agent's progress
GET http://localhost:5000/api/v1/incentives/progress/:agentId

# Check driver's progress
GET http://localhost:5000/api/v1/incentives/progress/:driverId

# User can check their own progress
GET http://localhost:5000/api/v1/incentives/progress/my
```

### 4. Check Rewards

```bash
# Check all rewards (admin)
GET http://localhost:5000/api/v1/incentives/rewards/all

# User can check their own rewards
GET http://localhost:5000/api/v1/incentives/rewards/my
```

## Common Scenarios

### Scenario 1: Agent Reaches Weekly Target

1. Agent makes sales throughout the week
2. Each delivered order calls `trackOrderCompletion()`
3. When total reaches ₹50,000, reward is auto-created
4. Agent can see reward in `/incentives/rewards/my`

### Scenario 2: Driver Completes 10 Orders with No Returns

1. Driver delivers orders
2. Each order with 0 returns calls `trackZeroReturns()`
3. Progress increments by 1 for each zero-return order
4. After 10th order, reward is auto-created

### Scenario 3: Customer Uses Referral Code

1. New customer signs up with referral code
2. System creates referral usage record
3. `handleReferralReward()` creates instant reward for referrer
4. Referrer sees ₹500 reward in their account

## Troubleshooting

### Issue: Progress not updating

**Check:**
- Is the incentive active for the user's role?
- Is the branchId matching (if specified)?
- Are there any errors in the console logs?

### Issue: Reward not created

**Check:**
- Has the user reached the target amount?
- Is the progress marked as completed?
- Check the database for IncentiveProgress and Reward entries

### Issue: Cron jobs not running

**Check:**
- Are the cron jobs imported in your main server file?
- Check server logs for cron job initialization messages
- Verify cron schedule syntax

## Database Queries for Debugging

```sql
-- Check all active incentives
db.incentives.find()

-- Check user's progress
db.incentive_progress.find({ userId: "user_id_here" })

-- Check user's rewards
db.rewards.find({ userId: "user_id_here" })

-- Check all incomplete progress for weekly incentives
db.incentive_progress.find({
  "incentive.type": "Weekly_achievement",
  completed: false
})
```

## Best Practices

1. ✅ Always wrap incentive tracking in try-catch blocks
2. ✅ Don't throw errors that would break the main order flow
3. ✅ Log errors for debugging but continue processing
4. ✅ Test incentive tracking in staging before production
5. ✅ Set up monitoring for cron job execution
6. ✅ Regularly review incentive configurations
7. ✅ Create different incentives per branch if needed

## Support

If you encounter any issues during integration, check:
1. Console logs for error messages
2. Database for correct incentive configurations
3. Progress tracking in real-time
4. Cron job execution logs
