const express = require("express");
const {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
} = require("../controllers/user.controller");
const { upload } = require("../middleware/uploadFile.middleware");
const { verifyJWTToken } = require("../middleware/auth.middleware");

const router = express.Router();

// Route to handle user registration with avatar and cover image upload
// Before registering a user, we need to upload the avatar and cover image to cloudinary and then store the image url in the database.
router.post(
  "/register",
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  registerUser
);

router.post("/login", loginUser);

// Secure routes.
// We are using verifyJWTToken middleware to verify the access token before allowing the user to logout.
router.post("/logout", verifyJWTToken, logoutUser);
router.post("/refresh-token", refreshAccessToken);
router.post("/change-password", verifyJWTToken, changeCurrentPassword);
router.post("/get-current-user", verifyJWTToken, getCurrentUser);
router.patch("/update-account-details", verifyJWTToken, updateAccountDetails);
router.patch(
  "/update-avatar",
  verifyJWTToken,
  upload.single("avatar"),
  updateUserAvatar
);
router.patch(
  "/update-cover-image",
  verifyJWTToken,
  upload.single("coverImage"),
  updateUserCoverImage
);
router.get("/c/:userName", verifyJWTToken, getUserChannelProfile);
router.get("/watch-history", verifyJWTToken, getWatchHistory);

module.exports = router;
