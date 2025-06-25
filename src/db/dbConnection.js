const mongoose = require("mongoose");
const DB_Name = require("../constant").DB_NAME;

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URI}/${DB_Name}`,
      {}
    );
    console.log(
      `DB Connection Successful. Host: ${connectionInstance.connection.host}`
    );
  } catch (err) {
    console.log("DB Connection Failed", err);
    process.exit(1);
  }
};

module.exports = connectDB;
