import { Request, Response, RequestHandler } from "express";
import { verifyWebhook } from "@clerk/backend/webhooks";
import { WebhookEvent } from "@clerk/backend";

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
  try {
    // Verify webhook using Clerk's built-in method
    const evt = (await verifyWebhook(req.body)) as WebhookEvent;

    // Access the event data
    const { data, type } = evt;
    const eventType = evt.type;

    console.log(`🔔 Clerk webhook received: ${eventType}`);

    // Define the type of userData as Partial<UserDocument> to allow missing fields
    let userData: Partial<UserDocument>;

    // Handle specific event types
    switch (eventType) {
      case "user.created":
        console.log("New user created:", evt.data.id);

        // Type guard to ensure we have user data
        if (!("id" in data) || !data.id) {
          console.error("Invalid user data: missing id");
          return void res.status(400).json({ error: "Invalid user data" });
        }

        const userEventData = data as any; // Type assertion for user data

        // 1. Check if user exists in YOUR DB (not Clerk)
        const existingUser = await UserModel.findOne({ _id: userEventData.id });
        if (existingUser) {
          console.log(
            `User ${userEventData.id} already exists, skipping creation`
          );
          return void res.status(200).json({ success: true }); // Avoid duplicates in your DB
        }

        // 2. Save to your DB
        await UserModel.create({
          _id: userEventData.id, // Ensure this is Clerk's user ID (e.g., "user_2abc123")
          email: userEventData.email_addresses?.[0]?.email_address,
          name: userEventData.first_name,
          image: userEventData.image_url,
          createdAt: getUTCDate(),
          updatedAt: getUTCDate(),
          role: "user",
        });

        console.log(`User ${userEventData.id} created successfully`);

        // 3. Update Clerk's metadata (CRITICAL: Use Clerk's user ID!)
        try {
          await clerkClient.users.updateUser(userEventData.id, {
            publicMetadata: { role: "user" }, // Attaches to existing Clerk user
          });
          console.log(`Clerk metadata updated for user: ${userEventData.id}`);
        } catch (err) {
          console.error("Failed to update Clerk metadata:", err);
        }

        return void res.status(200).json({ success: true });

      case "user.updated":
        console.log("User updated:", evt.data.id);

        if (!("id" in data) || !data.id) {
          console.error("Invalid user data: missing id");
          return void res.status(400).json({ error: "Invalid user data" });
        }

        const updatedUserData = data as any; // Type assertion for user data

        userData = {
          email: updatedUserData.email_addresses?.[0]?.email_address,
          name: updatedUserData.first_name,
          image: updatedUserData.image_url,
          updatedAt: getUTCDate(), // Update timestamp
        };
        await UserModel.findByIdAndUpdate(updatedUserData.id, userData);

        console.log(`User ${updatedUserData.id} updated successfully`);
        return void res.status(200).json({ success: true });

      case "user.deleted":
        console.log("User deleted:", evt.data.id);

        if (!("id" in data) || !data.id) {
          console.error("Invalid user data: missing id");
          return void res.status(400).json({ error: "Invalid user data" });
        }

        const deletedUserData = data as any; // Type assertion for user data

        await UserModel.findByIdAndDelete(deletedUserData.id);

        console.log(`User ${deletedUserData.id} deleted successfully`);
        return void res.status(200).json({ success: true });

      default:
        console.log(`Unknown event type: ${eventType}`);
        return void res.status(400).json({ error: "Unknown event type" });
    }
  } catch (error) {
    console.error("Webhook verification failed:", error);

    return void res.status(400).json({ error: "Webhook processing failed" });
  }
};

export default clerkWebhooks;
