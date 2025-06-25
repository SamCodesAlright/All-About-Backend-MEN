require("dotenv").config(); // Load .env variables
const connectDB = require("./db/dbConnection");
const { app } = require("./app"); // ✅ Use the app with routes and middleware registered

// Connect DB & Start Server
connectDB()
  .then(() => {
    const server = app.listen(process.env.PORT || 5000, () => {
      console.log(`Server is running on port ${process.env.PORT || 5000}`);
    });

    server.on("error", (err) => {
      console.error("Server error:", err);
      process.exit(1);
    });
  })
  .catch((err) => {
    console.error("Database connection failed:", err);
    process.exit(1);
  });
