import { Schema, model, models } from "mongoose";

const userSchema = new Schema({
  email: {
    type: String,
    unique: true,
    required: [true, "Email is required"],
    // match:[

    // ]
  },
  password: {
    type: String,
    required: [true, "Password is required"],
    select: false,
  },
  name: {
    type: String,
    required: [true, "Fullname is required"],
    minLength: [3, "Fullname must be at least 3 characters"],
    maxLength: [50, "Fullname must be at most 50 characters"],
  },
  user: {
    type: String,
    required: [true, "User is required"],
    minLength: [3, "User must be at least 3 characters"],
    maxLength: [10, "User must be at most 10 characters"],
  },
});

const User = models.User || model("User", userSchema);

export default User;
