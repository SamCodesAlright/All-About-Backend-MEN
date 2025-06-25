const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    subscriber: {
      type: mongoose.Schema.Types.ObjectId, // users who are subscribing to the channel.
      ref: "User",
    },
    channel: {
      type: mongoose.Schema.Types.ObjectId, // channel that is being subscribed to by the subscriber.
      ref: "User",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Subscription", subscriptionSchema);
