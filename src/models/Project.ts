import mongoose, { Document, Schema } from "mongoose";

export interface IProject extends Document {
  projectName: string;
  emoji: string;
  subdomain: string;
  customDomain?: string;
  domainStatus?: "pending" | "added" | "verified" | "failed";
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    projectName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    emoji: {
      type: String,
      required: true,
      default: "🚀",
    },
    subdomain: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    customDomain: {
      type: String,
      lowercase: true,
      trim: true,
    },
    domainStatus: {
      type: String,
      enum: ["pending", "added", "verified", "failed"],
      default: "pending",
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
  }
);

// Create indexes for better performance
ProjectSchema.index({ subdomain: 1 });
ProjectSchema.index({ customDomain: 1 });
ProjectSchema.index({ createdAt: -1 });

// Pre-save middleware to ensure subdomain is unique
ProjectSchema.pre("save", async function (next) {
  if (this.isModified("subdomain")) {
    const existingProject = await mongoose
      .model("Project")
      .findOne({ subdomain: this.subdomain, _id: { $ne: this._id } });

    if (existingProject) {
      throw new Error("Subdomain already exists");
    }
  }

  if (this.isModified("customDomain") && this.customDomain) {
    const existingProject = await mongoose
      .model("Project")
      .findOne({ customDomain: this.customDomain, _id: { $ne: this._id } });

    if (existingProject) {
      throw new Error("Custom domain already exists");
    }
  }

  next();
});

export const Project = mongoose.model<IProject>("Project", ProjectSchema);

export default Project;
