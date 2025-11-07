# Banner API Usage Guide

## Multer Configuration

The `fileUploadHelper.ts` is configured to accept:
- **1 vertical banner** (field name: `verticalBanner`)
- **Up to 4 horizontal banners** (field name: `horizontalBanner`)

```typescript
const uploadMultiple = upload.fields([
  { name: "verticalBanner", maxCount: 1 },
  { name: "horizontalBanner", maxCount: 4 },
  // ... other fields
]);
```

---

## API Endpoint

### Create Banner
**POST** `/api/v1/banner`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data Fields:**

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| `verticalBanner` | File | Yes | Vertical banner image (1 file) |
| `horizontalBanner` | File[] | Yes | Horizontal banner images (1-4 files) |
| `verticalTitle` | String | Yes | Title for vertical banner |
| `horizontalTitles` | JSON String | Yes | Array of titles for horizontal banners |
| `serialNos` | JSON String | Yes | Array of serial numbers for horizontal banners |
| `branchId` | String | Yes | MongoDB ObjectId of the branch |

---

## Example Request (Postman/Insomnia)

### Form Data:
```
verticalBanner: [File] example-vertical.jpg
horizontalBanner: [File] horizontal-1.jpg
horizontalBanner: [File] horizontal-2.jpg
horizontalBanner: [File] horizontal-3.jpg
horizontalBanner: [File] horizontal-4.jpg
verticalTitle: "Special Offer - 50% Off"
horizontalTitles: ["Summer Sale", "New Arrivals", "Best Sellers", "Limited Time"]
serialNos: [1, 2, 3, 4]
branchId: "60d5ec49f1b2c72b8c8e4f1a"
```

### Example using cURL:
```bash
curl -X POST http://localhost:5000/api/v1/banner \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "verticalBanner=@/path/to/vertical-banner.jpg" \
  -F "horizontalBanner=@/path/to/horizontal-1.jpg" \
  -F "horizontalBanner=@/path/to/horizontal-2.jpg" \
  -F "horizontalBanner=@/path/to/horizontal-3.jpg" \
  -F "horizontalBanner=@/path/to/horizontal-4.jpg" \
  -F 'verticalTitle=Special Offer - 50% Off' \
  -F 'horizontalTitles=["Summer Sale", "New Arrivals", "Best Sellers", "Limited Time"]' \
  -F 'serialNos=[1, 2, 3, 4]' \
  -F 'branchId=60d5ec49f1b2c72b8c8e4f1a'
```

### Example using JavaScript/Fetch:
```javascript
const formData = new FormData();

// Add vertical banner file
formData.append('verticalBanner', verticalBannerFile);

// Add horizontal banner files
horizontalBannerFiles.forEach(file => {
  formData.append('horizontalBanner', file);
});

// Add text fields
formData.append('verticalTitle', 'Special Offer - 50% Off');
formData.append('horizontalTitles', JSON.stringify([
  'Summer Sale',
  'New Arrivals',
  'Best Sellers',
  'Limited Time'
]));
formData.append('serialNos', JSON.stringify([1, 2, 3, 4]));
formData.append('branchId', '60d5ec49f1b2c72b8c8e4f1a');

// Send request
const response = await fetch('http://localhost:5000/api/v1/banner', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const result = await response.json();
console.log(result);
```

---

## Success Response

**Status Code:** `201 Created`

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Banners created successfully",
  "data": {
    "verticalBanner": {
      "id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "title": "Special Offer - 50% Off",
      "image": "https://your-space.digitaloceanspaces.com/your-bucket/vertical-banner.jpg",
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
        "image": "https://your-space.digitaloceanspaces.com/your-bucket/horizontal-1.jpg",
        "serialNo": 1,
        "horizontalBannerId": "65a1b2c3d4e5f6g7h8i9j0k2",
        "createdAt": "2025-11-07T10:30:00.000Z",
        "updatedAt": "2025-11-07T10:30:00.000Z"
      },
      {
        "id": "65a1b2c3d4e5f6g7h8i9j0k4",
        "title": "New Arrivals",
        "image": "https://your-space.digitaloceanspaces.com/your-bucket/horizontal-2.jpg",
        "serialNo": 2,
        "horizontalBannerId": "65a1b2c3d4e5f6g7h8i9j0k2",
        "createdAt": "2025-11-07T10:30:00.000Z",
        "updatedAt": "2025-11-07T10:30:00.000Z"
      },
      {
        "id": "65a1b2c3d4e5f6g7h8i9j0k5",
        "title": "Best Sellers",
        "image": "https://your-space.digitaloceanspaces.com/your-bucket/horizontal-3.jpg",
        "serialNo": 3,
        "horizontalBannerId": "65a1b2c3d4e5f6g7h8i9j0k2",
        "createdAt": "2025-11-07T10:30:00.000Z",
        "updatedAt": "2025-11-07T10:30:00.000Z"
      },
      {
        "id": "65a1b2c3d4e5f6g7h8i9j0k6",
        "title": "Limited Time",
        "image": "https://your-space.digitaloceanspaces.com/your-bucket/horizontal-4.jpg",
        "serialNo": 4,
        "horizontalBannerId": "65a1b2c3d4e5f6g7h8i9j0k2",
        "createdAt": "2025-11-07T10:30:00.000Z",
        "updatedAt": "2025-11-07T10:30:00.000Z"
      }
    ]
  }
}
```

---

## Error Responses

### Missing Vertical Banner
**Status Code:** `400 Bad Request`
```json
{
  "success": false,
  "message": "Vertical banner image is required",
  "errorMessages": []
}
```

### Missing Horizontal Banners
**Status Code:** `400 Bad Request`
```json
{
  "success": false,
  "message": "At least one horizontal banner image is required",
  "errorMessages": []
}
```

### Too Many Horizontal Banners
**Status Code:** `400 Bad Request`
```json
{
  "success": false,
  "message": "Maximum 4 horizontal banner images allowed",
  "errorMessages": []
}
```

### Mismatched Arrays
**Status Code:** `400 Bad Request`
```json
{
  "success": false,
  "message": "Number of horizontal banners, titles, and serial numbers must match",
  "errorMessages": []
}
```

### Branch Not Found
**Status Code:** `404 Not Found`
```json
{
  "success": false,
  "message": "Branch not found",
  "errorMessages": []
}
```

### Invalid JSON Format
**Status Code:** `400 Bad Request`
```json
{
  "success": false,
  "message": "horizontalTitles and serialNos must be valid JSON arrays",
  "errorMessages": []
}
```

---

## Other Endpoints

### Get All Banners
**GET** `/api/v1/banner`

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "All banners has been retrived successfully",
  "data": {
    "verticalBanners": [...],
    "horizontalBanners": [
      {
        "id": "...",
        "branchId": "...",
        "branch": {...},
        "horizontalBannerSlider": [
          {
            "title": "Summer Sale",
            "image": "...",
            "serialNo": 1
          },
          ...
        ]
      }
    ]
  }
}
```

### Get Banner By ID
**GET** `/api/v1/banner/:id`

### Delete Banner
**DELETE** `/api/v1/banner/:id`

---

## Database Schema

### verticalBanner Table
```prisma
model verticalBanner {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  title     String
  image     String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  branch    branch?  @relation(fields: [branchId], references: [id])
  branchId  String?  @db.ObjectId
}
```

### horizontalBanner Table
```prisma
model horizontalBanner {
  id                     String                   @id @default(auto())
  createdAt              DateTime                 @default(now())
  updatedAt              DateTime                 @updatedAt
  branch                 branch?                  @relation(fields: [branchId])
  branchId               String?                  @db.ObjectId
  horizontalBannerSlider horizontalBannerSlider[]
  
  @@unique([branchId])
}
```

### horizontalBannerSlider Table
```prisma
model horizontalBannerSlider {
  id                 String            @id @default(auto())
  title              String
  image              String
  serialNo           Int
  createdAt          DateTime          @default(now())
  updatedAt          DateTime          @updatedAt
  horizontalBanner   horizontalBanner? @relation(fields: [horizontalBannerId])
  horizontalBannerId String?           @db.ObjectId
}
```

---

## Notes

1. **File Upload**: All images are uploaded to DigitalOcean Spaces (AWS S3 compatible)
2. **Transaction**: Banner creation uses Prisma transaction to ensure atomicity
3. **Branch Uniqueness**: Each branch can have only one `horizontalBanner` record (enforced by unique constraint)
4. **Cascade Delete**: Deleting a `horizontalBanner` will automatically delete all its `horizontalBannerSlider` records
5. **Serial Numbers**: Used to control the display order of horizontal banners (sorted ascending)
6. **Authentication**: All endpoints require authentication token
