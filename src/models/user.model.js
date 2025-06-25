const mongoose = require("mongoose");
// "jwt" is a bearer token. Which means the user who bears (holds) this token is considered as a valid user.
// Use below code in terminal to generate tokens like ACCESS_TOKEN_SECRET or REFRESH_TOKEN_SECRET:
// node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    userName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    avatar: {
      type: String, // Cloudinary (A place where we can upload image and in return it will provide url to Store in db) URL.
      required: true,
    },
    coverImage: {
      type: String, // Cloudinary (A place where we can upload image and in return it will provide url to Store in db) URL.
    },
    refreshToken: {
      type: String,
    },
    watchHistory: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
  },
  { timestamps: true }
);

// Hashing the password for security before saving in the database
// .pre (hook) is a mongoose middleware that runs before the save operation on the User model. (save is one of many event of pre hook)
// yeh password ko hash karne ke liye use hota hai aur database mein pehle hash (encrypt) karke store karne ke liye.
// The reason we are using normal function instead of arrow function is because we need to access this keyword to reference password inside the function. And arrow function does not have its own this keyword.
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function (userPassword) {
  return await bcrypt.compare(userPassword, this.password);
};

// ".sign" methods is used to generate tokens.
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      userName: this.userName,
      fullName: this.fullName,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};

module.exports = mongoose.model("User", userSchema);
