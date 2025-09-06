import { Webhook } from "svix";
import { Request, Response, RequestHandler } from "express";

import UserModel, { UserDocument } from "../models/User";
import { Clerk } from "@clerk/clerk-sdk-node";
import { getUTCDate } from "../utils/date";
import config from "../config";
// Initialize Clerk with proper typing
const clerkClient = Clerk({
  secretKey: config.clerk.secretKey,
});

export const clerkWebhooks: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  console.log("🔔 Clerk webhook");

  try {
    // Ensure required headers are present
    const svixId = req.headers["svix-id"] as string | undefined;
    const svixTimestamp = req.headers["svix-timestamp"] as string | undefined;
    const svixSignature = req.headers["svix-signature"] as string | undefined;

    if (!svixId || !svixTimestamp || !svixSignature) {
      return void res.status(400).json({ error: "Missing Svix headers" });
    }

    // Getting data from request body
    const { data, type } = req.body;

    // Create a Svix instance with Clerk webhook secret
    const whook = new Webhook(config.clerk.webhookSecret);

    await whook.verify(JSON.stringify(req.body), {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    });

    // Define the type of userData as Partial<UserDocument> to allow missing fields
    let userData: Partial<UserDocument>;

    // Switch Cases for different Events
    switch (type) {
      case "user.created":
        // 1. Check if user exists in YOUR DB (not Clerk)
        const existingUser = await UserModel.findOne({ _id: data.id });
        if (existingUser) {
          return void res.status(200).json({ success: true }); // Avoid duplicates in your DB
        }

        // 2. Save to your DB
        await UserModel.create({
          _id: data.id, // Ensure this is Clerk's user ID (e.g., "user_2abc123")
          email: data.email_addresses[0]?.email_address,
          name: data.first_name,
          image: data.image_url,
          createdAt: getUTCDate(),
          updatedAt: getUTCDate(),
          role: "user",
        });

        // 3. Update Clerk's metadata (CRITICAL: Use Clerk's user ID!)
        try {
          await clerkClient.users.updateUser(data.id, {
            publicMetadata: { role: "user" }, // Attaches to existing Clerk user
          });
        } catch (err) {
          console.error("Failed to update Clerk metadata:", err);
        }

        return void res.status(200).json({ success: true });

      case "user.updated":
        userData = {
          email: data.email_addresses[0].email_address,
          name: data.first_name,
          image: data.image_url,
          updatedAt: getUTCDate(), // Update timestamp
        };
        await UserModel.findByIdAndUpdate(data.id, userData);

        return void res.status(200).json({ success: true });

      case "user.deleted":
        await UserModel.findByIdAndDelete(data.id);

        return void res.status(200).json({ success: true });

      default:
        return void res.status(400).json({ error: "Unknown event type" });
    }
  } catch (error) {
    console.error("Webhook verification failed:", error);

    return void res.status(400).json({ error: "Webhook processing failed" });
  }
};

export default clerkWebhooks;
