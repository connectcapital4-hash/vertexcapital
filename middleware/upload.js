const multer = require("multer");
const cloudinary = require("../config/cloudinary");

// Use memory storage in Multer to get file buffer
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.match(/(jpg|jpeg|png)$/)) {
      return cb(new Error("Only JPG, JPEG, PNG files are allowed"), false);
    }
    cb(null, true);
  },
});

/**
 * Upload a buffer to Cloudinary
 */
function uploadToCloudinary(fileBuffer, folder = "capitalconnect/uploads") {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder }, (error, result) => {
        if (error) return reject(error);
        resolve(result);
      })
      .end(fileBuffer);
  });
}

module.exports = { upload, uploadToCloudinary };
