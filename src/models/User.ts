import mongoose, { Document, Schema } from "mongoose";

export interface UserDocument extends Document {
  _id: string;
  email: string;
  name: string;
  image: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDocument>({
  _id: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  role: { type: String, default: "user" },
  name: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    required: true,
  },
  updatedAt: {
    type: Date,
    required: true,
  },
});

const UserModel = mongoose.model<UserDocument>("User", userSchema);
export default UserModel;
