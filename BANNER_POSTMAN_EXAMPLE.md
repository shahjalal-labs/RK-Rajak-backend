# Postman Request Example - Banner Upsert

## Endpoint
**POST** `http://localhost:5000/api/v1/banner`

## Headers
```
Authorization: Bearer YOUR_TOKEN_HERE
```

## Body (form-data)

| Key | Type | Value |
|-----|------|-------|
| `verticalBanner` | File | Select your vertical banner image file |
| `horizontalBanner` | File | Select 1st horizontal banner image |
| `horizontalBanner` | File | Select 2nd horizontal banner image |
| `horizontalBanner` | File | Select 3rd horizontal banner image |
| `horizontalBanner` | File | Select 4th horizontal banner image |
| `bodyData` | Text | See JSON below ⬇️ |

## bodyData JSON Value

```json
{
  "verticalTitle": "Special Offer - 50% Off",
  "horizontalTitles": [
    "Summer Sale",
    "New Arrivals",
    "Best Sellers",
    "Limited Time"
  ],
  "serialNos": [1, 2, 3, 4],
  "branchId": "60d5ec49f1b2c72b8c8e4f1a"
}
```

## Visual Guide (Postman)

### Step-by-step:

1. **Select POST method** and enter URL
2. **Go to Authorization tab:**
   - Type: Bearer Token
   - Token: `your_auth_token`

3. **Go to Body tab:**
   - Select `form-data`
   - Add the following fields:

```
KEY                  TYPE    VALUE
─────────────────────────────────────────────────────────
verticalBanner       File    [Choose File] vertical-banner.jpg
horizontalBanner     File    [Choose File] horizontal-1.jpg
horizontalBanner     File    [Choose File] horizontal-2.jpg
horizontalBanner     File    [Choose File] horizontal-3.jpg
horizontalBanner     File    [Choose File] horizontal-4.jpg
bodyData             Text    {"verticalTitle":"Special Offer - 50% Off","horizontalTitles":["Summer Sale","New Arrivals","Best Sellers","Limited Time"],"serialNos":[1,2,3,4],"branchId":"60d5ec49f1b2c72b8c8e4f1a"}
```

## Important Notes

⚠️ **Key Points:**
- Use `bodyData` as the key name (NOT `data` or anything else)
- The `bodyData` value must be valid JSON (minified, no line breaks in Postman)
- `horizontalBanner` key should be repeated for each file (1-4 files)
- Number of items in `horizontalTitles` and `serialNos` must match number of `horizontalBanner` files
- `serialNos` determines the display order (ascending)

## Example with 2 Horizontal Banners

```json
{
  "verticalTitle": "Weekend Sale",
  "horizontalTitles": [
    "Fruits Discount",
    "Vegetables Special"
  ],
  "serialNos": [1, 2],
  "branchId": "60d5ec49f1b2c72b8c8e4f1a"
}
```

In this case, only upload 2 `horizontalBanner` files.

## Expected Response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Banners saved successfully",
  "data": {
    "verticalBanner": {
      "id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "title": "Special Offer - 50% Off",
      "image": "https://your-space.digitaloceanspaces.com/bucket/vertical-banner.jpg",
      "branchId": "60d5ec49f1b2c72b8c8e4f1a",
      "createdAt": "2025-11-07T10:30:00.000Z",
      "updatedAt": "2025-11-07T10:30:00.000Z"
    },
    "horizontalBanner": {
      "id": "65a1b2c3d4e5f6g7h8i9j0k2",
      "branchId": "60d5ec49f1b2c72b8c8e4f1a",
      "createdAt": "2025-11-07T10:30:00.000Z",
      "updatedAt": "2025-11-07T10:30:00.000Z"
    },
    "horizontalBannerSliders": [
      {
        "id": "65a1b2c3d4e5f6g7h8i9j0k3",
        "title": "Summer Sale",
        "image": "https://your-space.digitaloceanspaces.com/bucket/horizontal-1.jpg",
        "serialNo": 1,
        "horizontalBannerId": "65a1b2c3d4e5f6g7h8i9j0k2",
        "createdAt": "2025-11-07T10:30:00.000Z",
        "updatedAt": "2025-11-07T10:30:00.000Z"
      },
      {
        "id": "65a1b2c3d4e5f6g7h8i9j0k4",
        "title": "New Arrivals",
        "image": "https://your-space.digitaloceanspaces.com/bucket/horizontal-2.jpg",
        "serialNo": 2,
        "horizontalBannerId": "65a1b2c3d4e5f6g7h8i9j0k2",
        "createdAt": "2025-11-07T10:30:00.000Z",
        "updatedAt": "2025-11-07T10:30:00.000Z"
      },
      {
        "id": "65a1b2c3d4e5f6g7h8i9j0k5",
        "title": "Best Sellers",
        "image": "https://your-space.digitaloceanspaces.com/bucket/horizontal-3.jpg",
        "serialNo": 3,
        "horizontalBannerId": "65a1b2c3d4e5f6g7h8i9j0k2",
        "createdAt": "2025-11-07T10:30:00.000Z",
        "updatedAt": "2025-11-07T10:30:00.000Z"
      },
      {
        "id": "65a1b2c3d4e5f6g7h8i9j0k6",
        "title": "Limited Time",
        "image": "https://your-space.digitaloceanspaces.com/bucket/horizontal-4.jpg",
        "serialNo": 4,
        "horizontalBannerId": "65a1b2c3d4e5f6g7h8i9j0k2",
        "createdAt": "2025-11-07T10:30:00.000Z",
        "updatedAt": "2025-11-07T10:30:00.000Z"
      }
    ]
  }
}
```
