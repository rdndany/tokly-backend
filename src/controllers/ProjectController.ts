import { Request, Response } from "express";
import { projectService } from "../services/projectService";
import { VercelService } from "../services/VercelService";
import {
  CreateProjectRequest,
  CreateProjectResponse,
  GetProjectResponse,
  ErrorResponse,
  DomainSetupInstructions,
  convertIProjectToProject,
} from "../types/project";

// Create a new project
export const createProject = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { projectName, emoji, description }: CreateProjectRequest = req.body;

    // Validate required fields
    if (!projectName || !emoji) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: "Missing required fields",
        message: "Project name and emoji are required",
      };
      res.status(400).json(errorResponse);
      return;
    }

    // Validate project name format
    if (typeof projectName !== "string" || projectName.trim().length === 0) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: "Invalid project name",
        message: "Project name must be a non-empty string",
      };
      res.status(400).json(errorResponse);
      return;
    }

    // Validate emoji
    if (typeof emoji !== "string" || emoji.trim().length === 0) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: "Invalid emoji",
        message: "Emoji is required",
      };
      res.status(400).json(errorResponse);
      return;
    }

    // Check if subdomain is available
    const sanitizedSubdomain = projectName
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "")
      .replace(/^-+|-+$/g, "");

    if (!sanitizedSubdomain) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: "Invalid project name",
        message:
          "Project name must contain at least one valid character (letters, numbers, or hyphens)",
      };
      res.status(400).json(errorResponse);
      return;
    }

    // Check if subdomain is available using service
    const isAvailable = await projectService.isSubdomainAvailable(projectName);
    if (!isAvailable) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: "Project name already taken",
        message:
          "This project name is already in use. Please choose a different name.",
      };
      res.status(409).json(errorResponse);
      return;
    }

    // Create the project using service
    const project = await projectService.createProject({
      projectName: projectName.trim(),
      emoji: emoji.trim(),
      description: description?.trim(),
      customDomain: req.body.customDomain?.trim(),
      useCustomDomain: req.body.useCustomDomain,
    });

    let domainSetup: DomainSetupInstructions | undefined;

    // If using custom domain, get setup instructions
    if (req.body.useCustomDomain && req.body.customDomain) {
      try {
        // Get domain setup info (always shows setup instructions initially)
        const domainSetupInfo = await VercelService.getDomainSetupInfo(
          req.body.customDomain.trim()
        );

        domainSetup = {
          domain: req.body.customDomain.trim(),
          verified: domainSetupInfo.verified, // This will always be false initially
          dnsRecords: domainSetupInfo.dnsRecords || [],
          instructions: {
            title: "Domain Setup Instructions",
            steps: [
              "1. Log in to your domain registrar's control panel",
              "2. Navigate to nameserver or DNS settings",
              "3. Replace your current nameservers with the Vercel nameservers shown below",
              "4. Save the changes and wait for DNS propagation (this can take up to 24 hours)",
              "5. Click 'Check DNS Configuration' button once nameservers are updated",
              "6. Your custom domain will be live once verification is complete",
            ],
            note: "DNS changes can take up to 24 hours to propagate. You can check the verification status anytime.",
          },
        };
      } catch (error) {
        console.error("Error getting domain setup instructions:", error);
        // Continue without domain setup instructions if there's an error
      }
    }

    const response: CreateProjectResponse = {
      success: true,
      project: convertIProjectToProject(project),
      message: req.body.useCustomDomain
        ? "Project created successfully! Please follow the domain setup instructions below."
        : "Project created successfully",
      domainSetup,
    };

    res.status(201).json(response);
  } catch (error) {
    console.error("Error creating project:", error);

    const errorResponse: ErrorResponse = {
      success: false,
      error: "Internal server error",
      message:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };

    res.status(500).json(errorResponse);
  }
};

// Get project by subdomain
export const getProjectBySubdomain = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { subdomain } = req.params;

    if (!subdomain) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: "Missing subdomain",
        message: "Subdomain parameter is required",
      };
      res.status(400).json(errorResponse);
      return;
    }

    const project = await projectService.getProjectBySubdomain(subdomain);

    if (!project) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: "Project not found",
        message: `No project found with subdomain: ${subdomain}`,
      };
      res.status(404).json(errorResponse);
      return;
    }

    const response: GetProjectResponse = {
      success: true,
      project: convertIProjectToProject(project),
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching project:", error);

    const errorResponse: ErrorResponse = {
      success: false,
      error: "Internal server error",
      message: "An unexpected error occurred while fetching the project",
    };

    res.status(500).json(errorResponse);
  }
};

// Get all projects (for admin purposes)
export const getAllProjects = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const projects = await projectService.getAllProjects();

    res.status(200).json({
      success: true,
      projects,
      count: projects.length,
    });
  } catch (error) {
    console.error("Error fetching all projects:", error);

    const errorResponse: ErrorResponse = {
      success: false,
      error: "Internal server error",
      message: "An unexpected error occurred while fetching projects",
    };

    res.status(500).json(errorResponse);
  }
};

// Check if subdomain is available
export const checkSubdomainAvailability = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { subdomain } = req.params;

    if (!subdomain) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: "Missing subdomain",
        message: "Subdomain parameter is required",
      };
      res.status(400).json(errorResponse);
      return;
    }

    const isAvailable = await projectService.isSubdomainAvailable(subdomain);

    res.status(200).json({
      success: true,
      subdomain,
      available: isAvailable,
      message: isAvailable
        ? "Subdomain is available"
        : "Subdomain is already taken",
    });
  } catch (error) {
    console.error("Error checking subdomain availability:", error);

    const errorResponse: ErrorResponse = {
      success: false,
      error: "Internal server error",
      message:
        "An unexpected error occurred while checking subdomain availability",
    };

    res.status(500).json(errorResponse);
  }
};

// Get project statistics
export const getProjectStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const stats = await projectService.getProjectCount();

    res.status(200).json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Error fetching project stats:", error);

    const errorResponse: ErrorResponse = {
      success: false,
      error: "Internal server error",
      message: "An unexpected error occurred while fetching project statistics",
    };

    res.status(500).json(errorResponse);
  }
};
