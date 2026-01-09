import multer from "multer";

const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { fileSize: 3000 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/avif",
      "video/mp4",
      "video/x-matroska",
      "application/pdf",
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error("File type not allowed") as unknown as null, false);
    }
    cb(null, true);
  },
});

// upload single image
const videoUrl = upload.single("videoUrl");
const profileImage = upload.single("profileImage");
const coverPhoto = upload.single("coverPhoto");
const experienceFile = upload.single("experienceFile");
const uploadSingle = upload.single("file");

// upload multiple image
const uploadMultiple = upload.fields([
  { name: "profileImage", maxCount: 1 },
  { name: "mediaUrl", maxCount: 1 },
  { name: "documents", maxCount: 2 },
  { name: "productImages", maxCount: 5 },
  { name: "shopPhoto", maxCount: 1 },
  { name: "buyerPhoto", maxCount: 1 },
  { name: "verticalBanner", maxCount: 1 },
  { name: "file", maxCount: 10 },
  { name: "horizontalBanner", maxCount: 4 }, // Changed to 4 for horizontal banners
]);

export const fileUploader = {
  upload,
  videoUrl,
  uploadMultiple,
  profileImage,
  coverPhoto,
  uploadSingle,
  experienceFile,
};
