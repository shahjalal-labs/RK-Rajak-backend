# Banner API - Simplified

## Endpoints

### 1. Upsert Banner (Create or Update)
**POST** `/api/v1/banner`

**Description:** Creates new banners if they don't exist for the branch, or updates existing ones.

**Behavior:**
- If vertical banner exists for the branch → Updates it
- If vertical banner doesn't exist → Creates new one
- If horizontal banner exists for the branch → Deletes old sliders and creates new ones
- If horizontal banner doesn't exist → Creates new one with sliders

**Form Data:**
```
verticalBanner: [File] - Required, 1 image
horizontalBanner: [File] - Required, 1-4 images
verticalTitle: "Special Offer"
horizontalTitles: '["Sale 1", "Sale 2", "Sale 3", "Sale 4"]'
serialNos: '[1, 2, 3, 4]'
branchId: "60d5ec49f1b2c72b8c8e4f1a"
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Banners saved successfully",
  "data": {
    "verticalBanner": {
      "id": "...",
      "title": "Special Offer",
      "image": "https://...",
      "branchId": "..."
    },
    "horizontalBanner": {
      "id": "...",
      "branchId": "..."
    },
    "horizontalBannerSliders": [
      {
        "id": "...",
        "title": "Sale 1",
        "image": "https://...",
        "serialNo": 1,
        "horizontalBannerId": "..."
      }
    ]
  }
}
```

---

### 2. Get Banners by Branch ID
**GET** `/api/v1/banner/:branchId`

**Description:** Get both vertical and horizontal banners for a specific branch.

**Example:**
```
GET /api/v1/banner/60d5ec49f1b2c72b8c8e4f1a
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Banners retrieved successfully",
  "data": {
    "verticalBanner": {
      "id": "...",
      "title": "Special Offer",
      "image": "https://...",
      "branchId": "...",
      "createdAt": "...",
      "updatedAt": "..."
    },
    "horizontalBanner": {
      "id": "...",
      "branchId": "...",
      "createdAt": "...",
      "updatedAt": "...",
      "horizontalBannerSlider": [
        {
          "id": "...",
          "title": "Sale 1",
          "image": "https://...",
          "serialNo": 1,
          "horizontalBannerId": "...",
          "createdAt": "...",
          "updatedAt": "..."
        },
        {
          "id": "...",
          "title": "Sale 2",
          "image": "https://...",
          "serialNo": 2,
          "horizontalBannerId": "...",
          "createdAt": "...",
          "updatedAt": "..."
        }
      ]
    }
  }
}
```

**If no banners found:**
```json
{
  "success": false,
  "statusCode": 404,
  "message": "No banners found for this branch"
}
```

---

## Usage Example (JavaScript)

```javascript
// Upsert banners
const formData = new FormData();
formData.append('verticalBanner', verticalFile);
formData.append('horizontalBanner', horizontal1File);
formData.append('horizontalBanner', horizontal2File);
formData.append('verticalTitle', 'Summer Sale');
formData.append('horizontalTitles', JSON.stringify(['Fruits', 'Vegetables']));
formData.append('serialNos', JSON.stringify([1, 2]));
formData.append('branchId', branchId);

const response = await fetch('/api/v1/banner', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});

// Get banners
const banners = await fetch(`/api/v1/banner/${branchId}`);
const data = await banners.json();
console.log(data.data.verticalBanner);
console.log(data.data.horizontalBanner.horizontalBannerSlider);
```

---

## Key Features

✅ **Upsert Logic**: No need to check if banners exist - just submit and it handles create/update automatically  
✅ **Automatic Cleanup**: Old horizontal banner sliders are deleted when updating  
✅ **Transaction Safety**: All database operations are wrapped in a transaction  
✅ **Simple Response**: Get both vertical and horizontal banners in one call  
✅ **No Auth Required**: GET endpoint is public (POST requires auth)
