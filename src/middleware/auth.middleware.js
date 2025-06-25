const jwt = require("jsonwebtoken");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const User = require("../models/user.model");

// Note: Whenever we write a middleware we have to use "next" keyword to pass the control to the next middleware once the current middleware is executed. Middlewares are mostly used at the time of routing.
// "next" passes control to the next middleware/handler once token is verified.
exports.verifyJWTToken = asyncHandler(async (req, res, next) => {
  // First tries to read the token from the cookies.accessToken.
  // If not found, looks for Authorization: Bearer <token> header (common in API tools or mobile apps).
  const token =
    req.cookies?.accessToken ||
    req.header("Authorization")?.replace("Bearer ", "");
  if (!token) {
    throw new ApiError(401, "Unauthorized request");
  }
  try {
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );
    if (!user) {
      throw new ApiError(401, "Unauthorized request");
    }
    req.user = user;
    next();
  } catch (err) {
    throw new ApiError(401, "Invalid access token");
  }
});
