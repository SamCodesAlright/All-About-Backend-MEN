const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const User = require("../models/user.model");
const uploadOnCloudinary = require("../utils/cloudinary");
const ApiResponse = require("../utils/ApiResponse");
const jwt = require("jsonwebtoken");

const generateAccessAndRefreshToken = async (userId) => {
  try {
    // Find the user from the database using the userId that we have passed below in the loginUser function.
    const user = await User.findById(userId);

    // These are instance methods on the User model (defined elsewhere). "generateAccessToken()" typically creates a short-lived JWT. and "generateRefreshToken()" creates a long-lived JWT.
    // These methods are defined on the User model. And we are using them here too generate the tokens.
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // Saving the newly generated refreshToken in the database.
    user.refreshToken = refreshToken;
    // "validateBeforeSave: false": This statement means that "I trust that this document is mostly valid already — just update this one field without checking the rest."
    // If we not use this then it will run all schema validations before saving (like required fields, custom validators, etc.) If any validation fails, it will throw an error and NOT save the document.
    await user.save({ validateBeforeSave: false });

    // The reason we are returning the accessToken and refreshToken is because we need to send these tokens to the frontend so that the frontend can store them in the local storage and use them to authenticate the user.
    return { accessToken, refreshToken };
  } catch (err) {
    throw new ApiError(
      500,
      "Something went wrong while generating access and refresh token"
    );
  }
};

// Algorithm / Steps to register user into the database
// 1. Get the user data from frontend | request body
// 2. Validate the user data - not empty
// 3. Check if the user already exists - using username or email
// 4. check for images, check for avatar
// 5. Upload image to cloudinary, check for avatar
// 6. create user object - create entry in database
// 7. send response to frontend - remove password and refresh token
// 8. check if the user is created or not
// 9. if user is created, send response to frontend

const registerUser = asyncHandler(async (req, res) => {
  // Fetching the data from the frontend (user) using request body. We are using request body because we are using JSON format for data transfer.
  // {req.body} is available only if body-parser middleware (e.g., express.json()) is used.
  const { userName, email, password, fullName } = req.body;

  // Validating the data - checking if the user has entered all the fields or not.
  if (
    [userName, email, password, fullName].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  // Check if the user already exists
  const existingUser = await User.findOne({ $or: [{ email }, { userName }] });
  if (existingUser) {
    throw new ApiError(409, "User already exists");
  }

  // Fetching the path of avatar and cover image from the request.files object.
  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;

  // Checking if the path of cover image is present or not.
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  // Checking if the path of avatar image is present or not.
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar image is required");
  }

  // Uploading the avatar and cover image to cloudinary.
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  // Checkinng if the avatar and cover image is uploaded successfully or not.
  if (!avatar) {
    throw new ApiError(500, "Something went wrong with image upload");
  }

  // Creating the user object.
  const user = await User.create({
    userName: userName.toLowerCase(),
    email,
    password,
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
  });

  // Checking if the user is created or not using finddById method on User model.
  // After chechking the existencee of user, we are removing the password and refresh token from the user object.
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering user");
  }

  // Sending the response to the frontend using ApiResponse class.
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully"));
});

// Algorithm / Steps to login user into our application
// 1. Get the user data from frontend | request body
// 2. Validate the user data - not empty
// 3. Check if the user exists - using username or email | Also check if the users password matches with the database's password
// 4. If yes, then generate access and refresh token and send it in the form of cookies to frontend.

const loginUser = asyncHandler(async (req, res) => {
  const { userName, password } = req.body;

  // Validating the data - checking if the user has entered all the fields or not.
  if (!userName || !password) {
    throw new ApiError(400, "All fields are required");
  }

  // Checking if the user exists
  const user = await User.findOne({ userName });
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Check if the password is correct
  const isPasswordCorrect = await user.comparePassword(password);
  if (!isPasswordCorrect) {
    throw new ApiError(401, "Invalid credentials");
  }

  // Generate access and refresh token using the function we defined above.
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  // Fetch the user again and explicitly exclude password and refreshToken from the response. This is good security practice to not send sensitive fields to frontend.
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // httpOnly: Prevents frontend JS from accessing cookie (protects from XSS).
  // secure: Sends cookie only over HTTPS (won’t work on localhost unless using https).
  const options = {
    httpOnly: true,
    secure: true,
  };

  // Setting both tokens as cookies.
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "User logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  // "User.findByIdAndUpdate()": A Mongoose function to update a user's document in the database by ID.
  // { $set: { refreshToken: undefined } }: Removes the value of refresh token from the database, and sets it to undefined.
  // { new: true }: Returns the updated document with the new refresh token value.
  User.findByIdAndUpdate(
    req.user._id,
    { $set: { refreshToken: undefined } },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  // Clearing the cookies from the browser.
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

// Algorithm / Steps to refresh access token --------------------------------------------------------
// 1. Read the incoming refresh token.
// 2. Verify it's present.
// 3. Decode and verify it using the secret key.
// 4. Fetch the user based on decoded data.
// 5. Compare the DB's stored token with the incoming one.
// 6. If all is good, issue a new access and refresh token.
// 7. Return them in secure cookies + JSON.

const refreshAccessToken = asyncHandler(async (req, res) => {
  // Firstly, we are fetchinng the refresh token from the cookies. If not fouund, we are fetching it from the request body (for mobile users).
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  // If the refresh token is not found, we are throwing an error.
  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }

  try {
    // jwt.verify(...): Verifies the integrity and validity of the JWT (refresh token).
    // Uses a secret key (REFRESH_TOKEN_SECRET) to decode and validate it.
    // decodeToken: Now contains the payload of the JWT (e.g., _id)
    const decodeToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    // Finding the user using the decoded token's id.
    // Retrieves the user from the database using the _id extracted from the decoded token.
    const user = await User.findById(decodeToken?._id);
    if (!user) {
      throw new ApiError(401, "Invalid Refresh Token");
    }

    // Checking if the refresh token in the database matches with the incoming refresh token.
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Invalid Refresh Token");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    // If everything is fine, we are generating a new access token.
    // Calls a custom function to generate a new access token and new refresh token.
    // To maintain security, refresh tokens are usually rotated (old one invalidated).
    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);

    // Sending the new access token in the response.
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed successfully"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid Refresh Token");
  }
});

// This function allows a logged-in user to change their password by:
// Verifying their current password (oldPassword).
// Setting a new password (newPassword) if the old one is correct.
// It ensures that: Only the authenticated user can change their password. Malicious actors cannot change the password without knowing the current one
const changeCurrentPassword = asyncHandler(async (req, res) => {
  // Uses object destructuring to extract oldPassword and newPassword from the request payload.
  // These are expected to be sent by the user from the frontend in JSON:
  const { oldPassword, newPassword } = req.body;

  // User.findById(...): Mongoose method to find a document by its ID.
  // req.user._id: The authenticated user's ID is usually added to the request object via middleware (e.g., after verifying JWT).
  const user = await User.findById(req.user._id);

  // user.comparePassword(...): A custom method defined on the User model file to compare plaintext (oldPassword) with the hashed password in DB.
  const isPasswordCorrect = await user.comparePassword(oldPassword);
  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid credentials");
  }

  // Assigns the new password to the user’s password field.
  // The password should be hashed automatically before saving (via Mongoose pre-save hook).
  user.password = newPassword;
  // Saves the updated user document to the database.
  await user.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User fetched successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  // Uses object destructuring to extract the fullName and email sent by the frontend.
  const { fullName, email } = req.body;

  // Checking if either field is missing or empty.
  if (!fullName || !email) {
    throw new ApiError(400, "Please provide all values");
  }

  // User.findByIdAndUpdate(...): Updates the user with the provided _id (authenticated user's ID).
  // req.user?._id: Extracts the user's ID from the request object. This ID must have been added during authentication (e.g., from a middleware that decodes JWT).
  // $set: A MongoDB operator to set the fields (fullName, email) to new values.
  // { new: true }: Ensures that the updated user document is returned instead of the old one.q
  // .select("-password"): Excludes the password field from the returned document for security (never send passwords to the client even if hashed).
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: { fullName, email },
    },
    { new: true }
  ).select("-password");
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Account details updated successfully"));
});

// Algorithm / Steps to handle the uploading and updating of a user’s avatar/profile picture.
// 1. Get the uploaded image from local server.
// 2. Upload it to Cloudinary (a cloud-based image hosting service).
// 3. Save the image URL in the user’s profile.
// 4. Return a success response.

const updateUserAvatar = asyncHandler(async (req, res) => {
  // "req.file": Comes from multer (a Node.js middleware for handling multipart/form-data for file uploads).
  // path: Local filesystem path where the file was saved temporarily.
  const avatarLocalPath = req.file?.path;

  // If no file was uploaded, throw an error.
  if (!avatarLocalPath) {
    throw new ApiError(400, "Please provide an avatar");
  }

  // Upload the image to Cloudinary.
  const avatar = await uploadOnCloudinary(avatarLocalPath);

  // If the upload fails, throw an error.
  if (!avatar.url) {
    // Delete temp file even if Cloudinary upload fails
    fs.unlinkSync(avatarLocalPath);
    throw new ApiError(400, "Avatar uploading failed");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: { avatar: avatar.url },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "Please provide a cover image");
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!coverImage.url) {
    throw new ApiError(400, "Cover image uploading failed");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: { coverImage: coverImage.url },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover image updated successfully"));
});

// The goal is to fetch a user’s public channel profile from the database, enriched with:
// Their basic details
// Their subscribers
// The channels they are subscribed to
// The counts of both
// Whether the logged-in user is subscribed to this channel
const getUserChannelProfile = asyncHandler(async (req, res) => {
  // req.params provides access to the dynamic parameters in the URL. Here, it's used to get the userName from the URL.
  const { userName } = req.params;

  // Validates the input. `.trim()` removes whitespace.
  // Throws an error if it's empty — helps avoid unnecessary DB calls.
  if (!userName?.trim()) {
    throw new ApiError(400, "Please provide a user name");
  }

  // User.aggregate([...]): Runs a pipeline of MongoDB operations on the User collection.
  const channel = await User.aggregate([
    {
      // Purpose: Filter documents to match only the one with the provided userName.
      $match: { userName: userName?.toLowerCase() },
    },
    {
      // Joins the Subscription model | collection. Fetches all users who subscribed to this channel.
      // Equivalent to a JOIN in SQL: User._id ←→ Subscription.channel
      // Results stored in subscribers array.
      // This gives you a list of who is subscribed to this channel.
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      // Fetches all channels that this user is subscribed to. User._id ←→ Subscription.subscriber
      // Results stored in subscribedTo array.
      // This gives you the channels that this user follows or subscribes to.
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      // Adds new computed fields to the documents
      // ($size): Counts the number of subscribers.
      $addFields: {
        subscribersCount: { $size: "$subscribers" },
        subscribedToCount: { $size: "$subscribedTo" },

        // Checks if the currently logged-in user (req.user._id) exists in the subscribers.subscriber array.
        // Why? To show a "Subscribed"/"Unsubscribed" button on frontend based on status.
        isSubscribedToChannel: {
          // This condition is used to determine: Is the logged-in user subscribed to this channel?
          // It checks whether "req.user._id" (the logged-in user) is found inside the channel’s subscribers.
          // $cond is MongoDB’s "if-else" operator. It works like a ternary condition.
          $cond: {
            // req.user?._id: The ID of the logged-in user (viewer).
            // ($subscribers.subscriber): subscribers is an array of Subscription documents (thanks to $lookup). We're accessing the subscriber field from each document in the subscribers array. Extract all values from subscribers[].subscriber
            // Checking if req.user._id is in the array of subscribers.subscriber
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true, // if viewer is subscribed to channel, then true
            else: false, // if viewer is not subscribed to channel, then false
          },
        },
      },
    },
    {
      // Only selects specific fields to return — others are excluded.
      // 1 means "include this field" to send to frontend.
      $project: {
        fullName: 1,
        userName: 1,
        avatar: 1,
        coverImage: 1,
        subscribersCount: 1,
        subscribedToCount: 1,
        isSubscribedToChannel: 1,
        email: 1,
      },
    },
  ]);
  console.log(channel);

  // If no channel is found, throw an error.
  if (!channel?.length) {
    throw new ApiError(404, "Channel not found");
  }

  // Return the channel details. The channel[0] is to get the first (and only) item in the array.
  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "User Channel fetched successfully")
    );
});

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      // Purpose: Filters the User collection to find only the current user. Uses _id (indexed field) for fast lookup.
      $match: {
        _id: req.user._id,
      },
    },
    {
      // Joins the User collection with videos using:
      // localField: watchHistory (array of video IDs stored in the user document).
      // foreignField: _id (the video's primary key).
      // as: Stores the joined videos back into watchHistory.
      // Converting video IDs into full video documents.
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            // What it does: For each video, it fetches the owner's details (fullName, userName, avatar).
            // Why?: Avoids sending unnecessary user data (like email, password).
            // Performance: Uses $project to limit returned fields (good practice).
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    userName: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            // What it does: The $lookup returns an array (owner: [...]), but we only need the first (and only) element.
            // Why?: Makes the response cleaner (owner: { ... } instead of owner: [{ ... }]).
            $addFields: {
              owner: { $first: "$owner" },
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        "User Watch History fetched successfully"
      )
    );
});

module.exports = {
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
};
