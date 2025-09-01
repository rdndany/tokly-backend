import { Request, Response, NextFunction } from "express";

// Middleware to validate project creation request
export const validateCreateProject = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { projectName, emoji } = req.body;

  // Check if required fields are present
  if (!projectName || !emoji) {
    res.status(400).json({
      success: false,
      error: "Missing required fields",
      message: "Project name and emoji are required",
    });
    return;
  }

  // Validate project name
  if (typeof projectName !== "string" || projectName.trim().length === 0) {
    res.status(400).json({
      success: false,
      error: "Invalid project name",
      message: "Project name must be a non-empty string",
    });
    return;
  }

  // Validate emoji
  if (typeof emoji !== "string" || emoji.trim().length === 0) {
    res.status(400).json({
      success: false,
      error: "Invalid emoji",
      message: "Emoji is required",
    });
    return;
  }

  // Check project name length
  if (projectName.length > 50) {
    res.status(400).json({
      success: false,
      error: "Project name too long",
      message: "Project name must be 50 characters or less",
    });
    return;
  }

  // Check for valid characters in project name
  const validNameRegex = /^[a-zA-Z0-9\s-]+$/;
  if (!validNameRegex.test(projectName)) {
    res.status(400).json({
      success: false,
      error: "Invalid characters in project name",
      message:
        "Project name can only contain letters, numbers, spaces, and hyphens",
    });
    return;
  }

  next();
};

// Middleware to validate subdomain parameter
export const validateSubdomain = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { subdomain } = req.params;

  if (!subdomain) {
    res.status(400).json({
      success: false,
      error: "Missing subdomain",
      message: "Subdomain parameter is required",
    });
    return;
  }

  // Check subdomain length
  if (subdomain.length > 50) {
    res.status(400).json({
      success: false,
      error: "Subdomain too long",
      message: "Subdomain must be 50 characters or less",
    });
    return;
  }

  // Check for valid characters in subdomain
  const validSubdomainRegex = /^[a-zA-Z0-9-]+$/;
  if (!validSubdomainRegex.test(subdomain)) {
    res.status(400).json({
      success: false,
      error: "Invalid characters in subdomain",
      message: "Subdomain can only contain letters, numbers, and hyphens",
    });
    return;
  }

  next();
};

// Middleware to sanitize request body
export const sanitizeRequestBody = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (req.body) {
    // Trim string fields
    if (req.body.projectName && typeof req.body.projectName === "string") {
      req.body.projectName = req.body.projectName.trim();
    }
    if (req.body.emoji && typeof req.body.emoji === "string") {
      req.body.emoji = req.body.emoji.trim();
    }
  }
  next();
};
