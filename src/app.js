const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json({ limit: "20kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// Routes
const userRoutes = require("./routes/user.routes");
// const videoRoutes = require("./routes/video.routes");

app.use("/api/v1/users", userRoutes);
// app.use("/api/v1/videos", videoRoutes);

exports.app = app;
