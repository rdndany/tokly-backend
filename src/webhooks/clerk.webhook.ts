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

// Helper function to get full name from Clerk data
const getFullName = (data: any): string => {
  if (data.first_name && data.last_name) {
    return `${data.first_name} ${data.last_name}`.trim();
  }
  return data.first_name || data.username || "Unknown";
};

export const clerkWebhooks: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  const webhookId = (req.headers["svix-id"] as string) || "unknown";
  console.log(`🔔 Clerk webhook received [${webhookId}]`);

  try {
    // Ensure required headers are present
    const svixId = req.headers["svix-id"] as string | undefined;
    const svixTimestamp = req.headers["svix-timestamp"] as string | undefined;
    const svixSignature = req.headers["svix-signature"] as string | undefined;

    if (!svixId || !svixTimestamp || !svixSignature) {
      console.error(`❌ [${webhookId}] Missing Svix headers`);
      return void res.status(400).json({ error: "Missing Svix headers" });
    }

    // Create a Svix instance with Clerk webhook secret
    const whook = new Webhook(config.clerk.webhookSecret);

    // Verify using raw body (Buffer) converted to string
    const payload = whook.verify(req.body.toString(), {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as { data: any; type: string };

    console.log(`✅ [${webhookId}] Webhook signature verified`);

    // Parse the verified payload
    const { data, type } = payload;

    // Validate data structure
    if (!data || !data.id) {
      console.error(`❌ [${webhookId}] Invalid webhook data:`, { type, data });
      return void res.status(400).json({ error: "Invalid webhook data" });
    }

    console.log(
      `📝 [${webhookId}] Processing webhook: ${type} for user: ${data.id}`
    );

    // Debug: Log the name-related data
    if (type === "user.created" || type === "user.updated") {
      console.log(`🔍 [${webhookId}] Name data:`, {
        first_name: data.first_name,
        last_name: data.last_name,
        username: data.username,
        full_name: data.full_name,
      });
    }

    // Switch Cases for different Events
    switch (type) {
      case "user.created":
        console.log(`👤 [${webhookId}] Creating user: ${data.id}`);

        // 1. Check if user exists in YOUR DB (not Clerk)
        const existingUser = await UserModel.findOne({ _id: data.id });
        if (existingUser) {
          console.log(
            `⚠️ [${webhookId}] User ${data.id} already exists, skipping creation`
          );
          return void res
            .status(200)
            .json({ success: true, message: "User already exists" });
        }
        // 2. Save to your DB
        const newUser = await UserModel.create({
          _id: data.id, // Ensure this is Clerk's user ID (e.g., "user_2abc123")
          email: data.email_addresses?.[0]?.email_address,
          name: getFullName(data),
          image: data.image_url,
          createdAt: getUTCDate(),
          updatedAt: getUTCDate(),
          role: "user",
        });
        console.log(newUser);

        console.log(
          `✅ [${webhookId}] User created successfully: ${newUser._id}`
        );

        // 3. Update Clerk's metadata (CRITICAL: Use Clerk's user ID!)
        try {
          await clerkClient.users.updateUser(data.id, {
            publicMetadata: { role: "user" }, // Attaches to existing Clerk user
          });
          console.log(
            `✅ [${webhookId}] Clerk metadata updated for user: ${data.id}`
          );
        } catch (err) {
          console.error(
            `❌ [${webhookId}] Failed to update Clerk metadata:`,
            err
          );
        }

        return void res
          .status(200)
          .json({ success: true, message: "User created" });

      case "user.updated":
        console.log(`🔄 [${webhookId}] Updating user: ${data.id}`);

        // Check if user exists before updating
        const userToUpdate = await UserModel.findById(data.id);
        if (!userToUpdate) {
          console.log(
            `⚠️ [${webhookId}] User ${data.id} not found for update, creating instead`
          );
          // If user doesn't exist, create them (this can happen if webhooks are out of order)
          await UserModel.create({
            _id: data.id,
            email: data.email_addresses?.[0]?.email_address,
            name: getFullName(data),
            image: data.image_url,
            createdAt: getUTCDate(),
            updatedAt: getUTCDate(),
            role: "user",
          });
          console.log(
            `✅ [${webhookId}] User ${data.id} created during update event`
          );
          return void res
            .status(200)
            .json({ success: true, message: "User created during update" });
        }

        let userData: Partial<UserDocument>;
        const newName = getFullName(data);
        userData = {
          email: data.email_addresses?.[0]?.email_address,
          name: newName !== "Unknown" ? newName : userToUpdate.name,
          image: data.image_url,
          updatedAt: getUTCDate(), // Update timestamp
        };

        // Log the name update for debugging
        if (newName !== "Unknown" && newName !== userToUpdate.name) {
          console.log(
            `📝 [${webhookId}] Updating name from "${userToUpdate.name}" to "${newName}"`
          );
        }

        await UserModel.findByIdAndUpdate(data.id, userData);
        console.log(`✅ [${webhookId}] User ${data.id} updated successfully`);

        return void res
          .status(200)
          .json({ success: true, message: "User updated" });

      case "user.deleted":
        console.log(`🗑️ [${webhookId}] User deletion requested: ${data.id}`);

        // IMPORTANT: Only delete if explicitly requested by Clerk
        // Sometimes this event can be triggered incorrectly
        const userToDelete = await UserModel.findById(data.id);
        if (!userToDelete) {
          console.log(
            `⚠️ [${webhookId}] User ${data.id} not found for deletion`
          );
          return void res
            .status(200)
            .json({ success: true, message: "User not found for deletion" });
        }

        // Log the deletion for debugging
        console.log(
          `🗑️ [${webhookId}] Deleting user: ${data.id} (${userToDelete.email})`
        );

        await UserModel.findByIdAndDelete(data.id);
        console.log(`✅ [${webhookId}] User ${data.id} deleted successfully`);

        return void res
          .status(200)
          .json({ success: true, message: "User deleted" });

      default:
        console.log(`❓ [${webhookId}] Unknown webhook event type: ${type}`);
        return void res.status(400).json({ error: "Unknown event type" });
    }
  } catch (error) {
    console.error(`❌ [${webhookId}] Webhook processing failed:`, error);
    console.error(`📋 [${webhookId}] Webhook body:`, req.body.toString());

    return void res.status(400).json({ error: "Webhook processing failed" });
  }
};

export default clerkWebhooks;
