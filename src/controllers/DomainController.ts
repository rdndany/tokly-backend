import { Request, Response } from "express";
import { VercelService } from "../services/VercelService";
import { projectService } from "../services/projectService";
import { ErrorResponse, convertIProjectToProject } from "../types/project";

// Add custom domain to project
export const addCustomDomain = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { projectId, domain } = req.body;

    if (!projectId || !domain) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: "Missing required fields",
        message: "Project ID and domain are required",
      };
      res.status(400).json(errorResponse);
      return;
    }

    // Get the project
    const project = await projectService.getProjectById(projectId);
    if (!project) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: "Project not found",
        message: "No project found with the provided ID",
      };
      res.status(404).json(errorResponse);
      return;
    }

    // Validate domain format
    const domainValidation = VercelService.validateDomain(domain);
    if (!domainValidation.isValid) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: "Invalid domain",
        message: domainValidation.error,
      };
      res.status(400).json(errorResponse);
      return;
    }

    // Check if domain is already in use
    if (!(await projectService.isCustomDomainAvailable(domain))) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: "Domain already in use",
        message: "This domain is already being used by another project",
      };
      res.status(409).json(errorResponse);
      return;
    }

    // Check if domain is available on Vercel
    const isAvailable = await VercelService.isDomainAvailable(domain);
    if (!isAvailable) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: "Domain not available",
        message: "This domain is already configured on Vercel",
      };
      res.status(409).json(errorResponse);
      return;
    }

    // Add domain to Vercel
    const vercelDomain = await VercelService.addDomain(domain);

    // Update project with custom domain
    const updatedProject = await projectService.updateProject(projectId, {
      customDomain: domain,
      domainStatus: "pending",
    });

    if (!updatedProject) {
      // If project update fails, remove domain from Vercel
      try {
        await VercelService.removeDomain(domain);
      } catch (removeError) {
        console.error(
          "Failed to remove domain from Vercel after project update failure:",
          removeError
        );
      }

      const errorResponse: ErrorResponse = {
        success: false,
        error: "Failed to update project",
        message: "Could not update project with custom domain",
      };
      res.status(500).json(errorResponse);
      return;
    }

    res.status(200).json({
      success: true,
      project: updatedProject,
      vercelDomain,
      message:
        "Custom domain added successfully. Please configure your DNS settings.",
    });
  } catch (error) {
    console.error("Error adding custom domain:", error);

    const errorResponse: ErrorResponse = {
      success: false,
      error: "Internal server error",
      message:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };

    res.status(500).json(errorResponse);
  }
};

// Verify domain ownership
export const verifyDomain = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { projectId } = req.params;
    const { domain } = req.body;

    console.log("Verify domain request:", {
      projectId,
      domain,
      params: req.params,
    });

    if (!projectId) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: "Missing project ID",
        message: "Project ID is required",
      };
      res.status(400).json(errorResponse);
      return;
    }

    if (!domain) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: "Missing domain",
        message: "Domain is required",
      };
      res.status(400).json(errorResponse);
      return;
    }

    // Get the project
    const project = await projectService.getProjectById(projectId);
    if (!project) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: "Project not found",
        message: "No project found with the provided ID",
      };
      res.status(404).json(errorResponse);
      return;
    }

    if (project.customDomain !== domain) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: "Domain mismatch",
        message:
          "The provided domain does not match the project's custom domain",
      };
      res.status(400).json(errorResponse);
      return;
    }

    // Check if domain is ready for verification (must be in "added" status)
    if (project.domainStatus !== "added") {
      const errorResponse: ErrorResponse = {
        success: false,
        error: "Domain not ready for verification",
        message:
          project.domainStatus === "pending"
            ? "Domain is still being added to Vercel. Please wait a moment and try again."
            : project.domainStatus === "verified"
            ? "Domain is already verified."
            : project.domainStatus === "failed"
            ? "Domain addition failed. Please contact support."
            : "Domain is not in the correct state for verification.",
      };
      res.status(400).json(errorResponse);
      return;
    }

    // Trigger domain verification with Vercel
    console.log(`Triggering verification for domain: ${domain}`);
    const vercelResponse = await VercelService.verifyDomain(domain);
    console.log(`Vercel verification response:`, vercelResponse);

    // Wait a moment for verification to process, then check the status
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Check the verification status after triggering verification
    const domainStatus = await VercelService.checkDomainVerificationStatus(
      domain
    );
    console.log(`Domain verification status:`, domainStatus);
    console.log(`Final verification result:`, {
      verified: domainStatus.verified,
      usingVercelDNS: domainStatus.usingVercelDNS,
      finalStatus:
        domainStatus.verified && domainStatus.usingVercelDNS
          ? "verified"
          : "added",
    });

    // Update project domain status based on actual verification result
    // Domain is verified if Vercel confirms it's verified AND it's using Vercel DNS
    const status =
      domainStatus.verified && domainStatus.usingVercelDNS
        ? "verified"
        : "added";
    const updatedProject = await projectService.updateDomainStatus(
      projectId,
      status
    );

    if (!updatedProject) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: "Failed to update project",
        message: "Could not update project domain status",
      };
      res.status(500).json(errorResponse);
      return;
    }

    // Get Vercel nameserver configuration
    const vercelNameservers = [
      {
        type: "NS",
        name: "@",
        value: "ns1.vercel-dns.com",
        reason: "Vercel nameserver",
      },
      {
        type: "NS",
        name: "@",
        value: "ns2.vercel-dns.com",
        reason: "Vercel nameserver",
      },
    ];

    res.status(200).json({
      success: true,
      project: updatedProject,
      vercelDomain: {
        verified: domainStatus.verified,
        verification: domainStatus.verification,
        configuration: domainStatus.configuration,
        verificationResponse: vercelResponse,
        usingVercelDNS: domainStatus.usingVercelDNS,
        dnsRecords: vercelNameservers,
      },
      message:
        domainStatus.verified && domainStatus.usingVercelDNS
          ? "Domain verified successfully! Your project is now live with your custom domain."
          : domainStatus.verified && !domainStatus.usingVercelDNS
          ? "Domain is verified but not using Vercel DNS. Please update your nameservers to Vercel DNS."
          : "DNS verification failed. Please update your nameservers to Vercel DNS and try again.",
    });
  } catch (error) {
    console.error("Error verifying domain:", error);

    // Provide more specific error messages based on the error type
    let errorMessage = "An unexpected error occurred";
    let statusCode = 500;

    if (error instanceof Error) {
      if (
        error.message.includes("not_found") ||
        error.message.includes("Project Domain not found")
      ) {
        errorMessage =
          "Domain not found. Please ensure the domain is properly added to your Vercel project.";
        statusCode = 404;
      } else if (error.message.includes("verification")) {
        errorMessage =
          "Domain verification failed. Please check your DNS settings and try again.";
        statusCode = 400;
      } else {
        errorMessage = error.message;
      }
    }

    const errorResponse: ErrorResponse = {
      success: false,
      error: "Domain verification failed",
      message: errorMessage,
    };

    res.status(statusCode).json(errorResponse);
  }
};

// Remove custom domain from project
export const removeCustomDomain = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { projectId } = req.params;
    const { domain } = req.body;

    if (!domain) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: "Missing domain",
        message: "Domain is required",
      };
      res.status(400).json(errorResponse);
      return;
    }

    // Get the project
    const project = await projectService.getProjectById(projectId);
    if (!project) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: "Project not found",
        message: "No project found with the provided ID",
      };
      res.status(404).json(errorResponse);
      return;
    }

    if (project.customDomain !== domain) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: "Domain mismatch",
        message:
          "The provided domain does not match the project's custom domain",
      };
      res.status(400).json(errorResponse);
      return;
    }

    // Remove domain from Vercel
    await VercelService.removeDomain(domain);

    // Update project to remove custom domain
    const updatedProject = await projectService.updateProject(projectId, {
      customDomain: undefined,
      domainStatus: "verified",
    });

    if (!updatedProject) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: "Failed to update project",
        message: "Could not update project after removing custom domain",
      };
      res.status(500).json(errorResponse);
      return;
    }

    res.status(200).json({
      success: true,
      project: updatedProject,
      message: "Custom domain removed successfully",
    });
  } catch (error) {
    console.error("Error removing custom domain:", error);

    const errorResponse: ErrorResponse = {
      success: false,
      error: "Internal server error",
      message:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };

    res.status(500).json(errorResponse);
  }
};

// Check domain availability
export const checkDomainAvailability = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { domain } = req.params;

    if (!domain) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: "Missing domain",
        message: "Domain parameter is required",
      };
      res.status(400).json(errorResponse);
      return;
    }

    // Validate domain format
    const domainValidation = VercelService.validateDomain(domain);
    if (!domainValidation.isValid) {
      res.status(200).json({
        success: true,
        domain,
        available: false,
        message: domainValidation.error,
      });
      return;
    }

    // Check if domain is available in our system
    const isAvailableInSystem = await projectService.isCustomDomainAvailable(
      domain
    );
    if (!isAvailableInSystem) {
      res.status(200).json({
        success: true,
        domain,
        available: false,
        message: "Domain is already in use by another project",
      });
      return;
    }

    // Check if domain is available on Vercel
    const isAvailableOnVercel = await VercelService.isDomainAvailable(domain);

    res.status(200).json({
      success: true,
      domain,
      available: isAvailableOnVercel,
      message: isAvailableOnVercel
        ? "Domain is available"
        : "Domain is already configured on Vercel",
    });
  } catch (error) {
    console.error("Error checking domain availability:", error);

    const errorResponse: ErrorResponse = {
      success: false,
      error: "Internal server error",
      message:
        "An unexpected error occurred while checking domain availability",
    };

    res.status(500).json(errorResponse);
  }
};

// Get domain verification instructions
export const getDomainVerificationInstructions = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { domain } = req.params;

    if (!domain) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: "Missing domain",
        message: "Domain parameter is required",
      };
      res.status(400).json(errorResponse);
      return;
    }

    // Get domain verification status from Vercel
    const domainStatus = await VercelService.checkDomainVerificationStatus(
      domain
    );

    res.status(200).json({
      success: true,
      domain: domainStatus.configuration,
      instructions: {
        dnsRecords: domainStatus.verification || [],
        verified: domainStatus.verified,
        message: domainStatus.verified
          ? "Domain is verified and ready to use"
          : "Please add the following DNS records to verify domain ownership",
        setupSteps: [
          "1. Log in to your domain registrar's control panel",
          "2. Navigate to DNS management or DNS settings",
          "3. Add the DNS records shown below to verify domain ownership",
          "4. Wait for DNS propagation (this can take up to 24 hours)",
          "5. Click 'Verify Domain' button once DNS records are added",
          "6. Your custom domain will be live once verification is complete",
        ],
        note: "DNS changes can take up to 24 hours to propagate. You can check the verification status anytime.",
      },
    });
  } catch (error) {
    console.error("Error getting domain verification instructions:", error);

    const errorResponse: ErrorResponse = {
      success: false,
      error: "Internal server error",
      message:
        "An unexpected error occurred while getting verification instructions",
    };

    res.status(500).json(errorResponse);
  }
};
