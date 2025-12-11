# Quick Start Guide - Incentive System

## 🚀 Get Started in 5 Minutes

### Prerequisites
- ✅ Code changes already implemented
- ✅ Prisma client generated (`npx prisma generate` already run)
- ⚠️ Migration needed (see below)

---

## 📝 Step-by-Step Setup

### Step 1: Handle Database Migration (One-time)

**Fix referralCode duplicate issue:**

```javascript
// Connect to MongoDB and run:
use Rk-rajak

db.users.updateMany(
  { referralCode: null },
  [
    {
      $set: {
        referralCode: {
          $concat: ["REF_", { $toString: "$_id" }]
        }
      }
    }
  ]
)
```

**Then run migration:**
```bash
npx prisma migrate dev --name add-incentive-progress-fields
```

### Step 2: Start Server

```bash
npm run dev
```

**Look for this in logs:**
```
✅ Incentive cron jobs started successfully
```

### Step 3: Create Your First Incentive

**For Drivers (Zero Returns):**

```bash
POST http://localhost:5000/api/incentives
Authorization: Bearer YOUR_SUPER_ADMIN_TOKEN
Content-Type: application/json

{
  "role": "Driver",
  "type": "Zero_returns",
  "rewardAmount": 500,
  "branchId": "YOUR_BRANCH_ID"
}
```

**For Agents (Weekly Target):**

```bash
POST http://localhost:5000/api/incentives
Authorization: Bearer YOUR_SUPER_ADMIN_TOKEN
Content-Type: application/json

{
  "role": "Agent",
  "type": "Weekly_achievement",
  "targetAmount": 50000,
  "rewardAmount": 1000,
  "branchId": "YOUR_BRANCH_ID"
}
```

### Step 4: Test the System

**Assign orders to driver:**
- Use existing order assignment API
- Driver progress automatically created
- `totalAssignedOrders` incremented

**Deliver orders:**
- Mark orders as delivered (existing API)
- System tracks returns automatically
- Rewards created when eligible

**Check progress:**
```bash
GET http://localhost:5000/api/incentives/progress/my
Authorization: Bearer DRIVER_OR_AGENT_TOKEN
```

**View rewards:**
```bash
GET http://localhost:5000/api/incentives/rewards/my
Authorization: Bearer USER_TOKEN
```

---

## 🎯 How It Works

### Driver Flow (Simple)
1. Create incentive → All drivers get progress
2. Assign orders → Count tracked
3. Deliver ALL orders with ZERO returns → Reward earned ✅
4. Deliver ANY order with returns → No reward ❌
5. Next day → Progress resets automatically

### Agent Flow (Simple)
1. Create incentive → All agents get 7/30 day progress
2. Customer orders delivered → Agent earns commission
3. Reach target amount → Reward earned ✅
4. Period ends → New period starts automatically

---

## 📊 Admin Dashboard Queries

**View all incentives:**
```bash
GET /api/incentives?branchId=BRANCH_ID
```

**View all rewards:**
```bash
GET /api/incentives/rewards/all
```

**View specific user progress:**
```bash
GET /api/incentives/progress/:userId
```

**View specific user rewards:**
```bash
GET /api/incentives/rewards/:userId
```

---

## ⚙️ Configuration

### Change Cron Schedule

Edit `src/cron/incentives.cron.ts`:

```typescript
// Driver reset - default: every day at 00:00
export const driverDailyResetCron = cron.schedule(
  "0 0 * * *", // Change this
  // ...
)

// Agent reset - default: every day at 00:30
export const agentPeriodicResetCron = cron.schedule(
  "30 0 * * *", // Change this
  // ...
)
```

### Change Timezone

Edit `src/cron/incentives.cron.ts`:

```typescript
{
  timezone: "Asia/Kolkata", // Change this
}
```

---

## 🧪 Test Scenarios

### Test 1: Driver Earns Reward
1. Create Zero_returns incentive
2. Assign 3 orders to driver
3. Deliver all 3 without returns
4. Check rewards → Should see new reward ✅

### Test 2: Driver Doesn't Earn (Has Returns)
1. Assign 3 orders to driver
2. Deliver 2 without returns
3. Deliver 1 with returns
4. Check rewards → No new reward ❌

### Test 3: Agent Earns Reward
1. Create Weekly_achievement incentive (target: 50000)
2. Complete customer orders totaling 50000+
3. Check rewards → Should see new reward ✅

### Test 4: Progress Reset
1. Wait until next day (or manually run cron)
2. Driver progress resets
3. Agent progress continues until period ends

---

## 🐛 Quick Troubleshooting

### Cron Not Running
```bash
# Check logs
# Should see: "✅ Incentive cron jobs started successfully"

# Manually test:
# In your code, call the cron functions directly
```

### Progress Not Creating
**Check:**
- Incentive exists for the branch?
- User belongs to that branch?
- User role matches (Driver/Agent)?

### Reward Not Creating
**Check:**
- Driver: ALL orders completed with zero returns?
- Agent: Current amount >= target amount?
- Check `rewardClaimed` flag

### Database Errors
```bash
# Regenerate Prisma client
npx prisma generate

# Restart server
npm run dev
```

---

## 📈 What Gets Tracked

### For Drivers (Daily)
- Total orders assigned today
- Completed orders today
- Orders with zero returns
- Whether ANY order had returns
- Eligibility for reward
- Reward claimed status

### For Agents (Weekly/Monthly)
- Current sales amount
- Target amount
- Start date
- End date
- Completion status
- Reward claimed status

---

## ✅ Success Indicators

**Driver Success:**
```json
{
  "totalAssignedOrders": 5,
  "completedOrders": 5,
  "zeroReturnOrders": 5,
  "hasReturns": false,
  "isEligibleForReward": true,
  "rewardClaimed": true  // ✅ Reward earned!
}
```

**Agent Success:**
```json
{
  "currentAmount": 55000,
  "targetAmount": 50000,
  "isCompleted": true,
  "rewardClaimed": true,  // ✅ Reward earned!
  "percentageComplete": 110
}
```

---

## 🔐 API Security

All incentive endpoints require authentication:

- **Create/Update/Delete**: SuperAdmin, Owner only
- **View All**: SuperAdmin, Owner only
- **View My Progress**: Any authenticated user
- **View My Rewards**: Any authenticated user

---

## 📞 Need Help?

1. **Setup Issues** → Check `MIGRATION_GUIDE.md`
2. **Usage Guide** → Check `INCENTIVE_SYSTEM_IMPLEMENTATION.md`
3. **Technical Details** → Check `IMPLEMENTATION_SUMMARY.md`

---

## 🎉 You're Ready!

✅ Database migrated
✅ Cron jobs running
✅ Incentives created
✅ System tracking automatically

**The system is now:**
- 🔄 Tracking all driver deliveries
- 💰 Tracking all agent sales
- 🎁 Creating rewards automatically
- ⏰ Resetting progress on schedule

**No manual intervention needed!**

---

## 💡 Pro Tips

1. **Start Small**: Create one incentive per type first
2. **Monitor Logs**: Check for cron execution daily
3. **Test Thoroughly**: Try all scenarios before going live
4. **Communicate**: Inform drivers/agents about the system
5. **Review Regularly**: Check reward distribution weekly

---

**Happy Incentivizing! 🎯**
