# Database Migration Guide - Incentive System

## ⚠️ Important: Handle Before Running Migration

### Issue: Duplicate Referral Code Error
When running `npx prisma migrate`, you may encounter:
```
E11000 duplicate key error collection: users index: users_referralCode_key dup key: { referralCode: null }
```

This happens because multiple users have `null` referralCode, and the schema has a `@unique` constraint.

---

## 🔧 Solution: Fix Null Referral Codes

### Option 1: Set Empty Strings (Recommended)

**Using MongoDB Shell:**
```javascript
// Connect to your MongoDB
use Rk-rajak

// Update all null referralCodes to empty strings or unique values
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

// Verify
db.users.find({ referralCode: null }).count() // Should be 0
```

**Using Prisma (Alternative):**
```typescript
// Run this script before migration
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fixReferralCodes() {
  const usersWithNullReferral = await prisma.user.findMany({
    where: { referralCode: null },
    select: { id: true }
  });

  for (const user of usersWithNullReferral) {
    await prisma.user.update({
      where: { id: user.id },
      data: { referralCode: `REF_${user.id}` }
    });
  }

  console.log(`✅ Fixed ${usersWithNullReferral.length} users`);
}

fixReferralCodes().then(() => process.exit());
```

### Option 2: Remove Unique Constraint Temporarily

**Step 1:** Update schema (remove @unique):
```prisma
model User {
  // ...
  referralCode String? // Remove @unique temporarily
  // ...
}
```

**Step 2:** Run migration:
```bash
npx prisma migrate dev --name remove-referral-unique
```

**Step 3:** Fix data using Option 1

**Step 4:** Re-add @unique:
```prisma
model User {
  // ...
  referralCode String? @unique
  // ...
}
```

**Step 5:** Run migration again:
```bash
npx prisma migrate dev --name add-referral-unique
```

---

## 📋 Complete Migration Steps

### Step 1: Backup Database
```bash
# For MongoDB Atlas: Use backup feature in dashboard
# Or use mongodump
mongodump --uri="your-connection-string" --out=./backup
```

### Step 2: Fix Referral Codes
```bash
# Use Option 1 above (recommended)
```

### Step 3: Generate Prisma Client
```bash
cd "e:\Project_Porduction_Roton\RK-Rajak-ABS-Fruits"
npx prisma generate
```

### Step 4: Create Migration
```bash
npx prisma migrate dev --name add-incentive-progress-fields
```

### Step 5: Verify Migration
```bash
# Check collections created
# - driver_incentive_progress
# - agent_incentive_progress
# - rewards (should already exist)
```

### Step 6: Test Server
```bash
npm run dev
```

**Check logs for:**
```
✅ Incentive cron jobs started successfully
```

---

## 🧪 Post-Migration Testing

### 1. Verify Schema
```bash
npx prisma db pull
npx prisma format
```

### 2. Test API Endpoints
```bash
# Create test incentive
curl -X POST http://localhost:5000/api/incentives \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "Driver",
    "type": "Zero_returns",
    "rewardAmount": 500,
    "branchId": "YOUR_BRANCH_ID"
  }'
```

### 3. Check Progress Creation
```bash
# Assign orders to driver
# Verify progress created in driver_incentive_progress collection
```

---

## 🔍 Troubleshooting

### Migration Fails
**Error:** "Migration failed to apply cleanly"

**Solution:**
```bash
# Reset migration history (ONLY IN DEVELOPMENT)
npx prisma migrate reset

# Then re-run migration
npx prisma migrate dev
```

### Collections Not Created
**Check:**
```javascript
// In MongoDB
show collections
// Should see:
// - driver_incentive_progress
// - agent_incentive_progress
```

### Prisma Client Out of Sync
**Fix:**
```bash
npx prisma generate
# Restart your dev server
```

---

## 📊 Expected Database State After Migration

### New Collections
1. **driver_incentive_progress**
   - Fields: id, driverId, incentiveId, totalAssignedOrders, completedOrders, zeroReturnOrders, hasReturns, isEligibleForReward, rewardClaimed, currentDate, createdAt, updatedAt
   - Index: driverId + incentiveId + currentDate (unique)

2. **agent_incentive_progress**
   - Fields: id, agentId, incentiveId, targetAmount, currentAmount, startAt, endAt, isCompleted, rewardClaimed, periodType, createdAt, updatedAt
   - Index: agentId + incentiveId + startAt (unique)

3. **rewards** (should already exist)
   - Fields: id, userId, incentiveId, amount, achievedAt, createdAt, updatedAt

### Updated Collections
- **users**: referralCode should be unique (no more nulls)

---

## ⚡ Quick Fix Commands

### Clear All Progress (Development Only)
```javascript
// MongoDB Shell
db.driver_incentive_progress.deleteMany({})
db.agent_incentive_progress.deleteMany({})
db.rewards.deleteMany({})
```

### Manually Create Progress for Testing
```javascript
// MongoDB Shell
db.driver_incentive_progress.insertOne({
  driverId: ObjectId("DRIVER_ID"),
  incentiveId: ObjectId("INCENTIVE_ID"),
  totalAssignedOrders: 0,
  completedOrders: 0,
  zeroReturnOrders: 0,
  hasReturns: false,
  isEligibleForReward: false,
  rewardClaimed: false,
  currentDate: "2025-12-11",
  createdAt: new Date(),
  updatedAt: new Date()
})
```

---

## 🚀 Production Deployment

### Pre-Deployment Checklist
- [ ] Backup database
- [ ] Fix referralCode nulls in production
- [ ] Test migration in staging environment
- [ ] Verify all API endpoints work
- [ ] Test cron jobs manually
- [ ] Monitor server logs

### Deployment Steps
1. Schedule maintenance window
2. Backup production database
3. Fix referralCode issue
4. Deploy code with migration
5. Verify collections created
6. Test critical endpoints
7. Monitor cron execution

### Rollback Plan
```bash
# If issues occur
npx prisma migrate resolve --rolled-back MIGRATION_NAME

# Restore from backup
mongorestore --uri="your-connection-string" ./backup
```

---

## 📞 Support Contacts

If you encounter issues:
1. Check server logs for errors
2. Verify MongoDB connection
3. Ensure Prisma client is regenerated
4. Test cron functions manually
5. Check timezone configuration

---

**Status:** Ready for migration ✅
**Risk Level:** Low (with proper backup)
**Estimated Time:** 5-10 minutes
