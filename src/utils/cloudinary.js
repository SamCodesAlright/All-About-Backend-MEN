const cloudinary = require("cloudinary").v2;
const fs = require("fs");

// Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  if (!localFilePath) return null;

  try {
    // Upload to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    // Delete file if upload successful
    try {
      await fs.promises.unlink(localFilePath);
      console.log("Local file deleted:", localFilePath);
    } catch (unlinkErr) {
      console.error("Error deleting local file after upload:", unlinkErr);
    }

    return uploadResult;
  } catch (error) {
    console.error("Cloudinary upload failed:", error);

    // Try to delete file if upload failed
    try {
      await fs.promises.unlink(localFilePath);
      console.log("Local file deleted after failed upload:", localFilePath);
    } catch (unlinkErr) {
      console.error(
        "Error deleting local file after failed upload:",
        unlinkErr
      );
    }

    return null;
  }
};

module.exports = uploadOnCloudinary;

// const cloudinary = require("cloudinary").v2;
// const fs = require("fs");

// // Configuration
// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// const uploadOnCloudinary = async (localFilePath) => {
//   if (!localFilePath) return null;
//   try {
//     // Upload the file on cloudinary
//     const uploadResult = await cloudinary.uploader.upload(localFilePath, {
//       resource_type: "auto",
//     });
//     // Removing the locally saved temporary file as the upload operation is successful on cloudinary
//     fs.unlinkSync(localFilePath);
//     return uploadResult;
//   } catch (error) {
//     // Removing the locally saved temporary file as the upload operation failed
//     fs.unlinkSync(localFilePath);
//     return null;
//   }
// };

// module.exports = uploadOnCloudinary;
