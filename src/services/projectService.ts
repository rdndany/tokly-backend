import { Project, IProject } from "../models/Project";
import { CreateProjectRequest } from "../types/project";
import { VercelService } from "./VercelService";

// Validate and sanitize subdomain
const sanitizeSubdomain = (projectName: string): string => {
  return projectName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/^-+|-+$/g, "") // Remove leading/trailing hyphens
    .substring(0, 50); // Limit length
};

// Check if subdomain is available
export const isSubdomainAvailable = async (
  subdomain: string
): Promise<boolean> => {
  const sanitized = sanitizeSubdomain(subdomain);
  const existingProject = await Project.findOne({ subdomain: sanitized });
  return !existingProject;
};

// Create a new project
export const createProject = async (
  data: CreateProjectRequest
): Promise<IProject> => {
  const sanitizedSubdomain = sanitizeSubdomain(data.projectName);

  if (!sanitizedSubdomain) {
    throw new Error(
      "Invalid project name. Please use only letters, numbers, and hyphens."
    );
  }

  // Check if subdomain already exists
  const existingProject = await Project.findOne({
    subdomain: sanitizedSubdomain,
  });
  if (existingProject) {
    throw new Error(
      "Project name is already taken. Please choose a different name."
    );
  }

  const useCustomDomain = data.useCustomDomain && data.customDomain;

  // If using custom domain, check if it's available
  if (useCustomDomain && data.customDomain) {
    const existingCustomDomain = await Project.findOne({
      customDomain: data.customDomain,
    });
    if (existingCustomDomain) {
      throw new Error("Custom domain is already in use.");
    }
  }

  // Create the project
  const projectData = {
    projectName: data.projectName,
    subdomain: sanitizedSubdomain,
    customDomain: useCustomDomain ? data.customDomain : undefined,
    emoji: data.emoji || "🚀",
    domainStatus: useCustomDomain ? "pending" : "verified",
  };

  const project = new Project(projectData);
  await project.save();

  // If using custom domain, add it to Vercel
  if (useCustomDomain && data.customDomain) {
    try {
      await VercelService.addDomain(data.customDomain);

      // Update domain status to "added" - domain is added to Vercel but DNS not configured yet
      project.domainStatus = "added";
      await project.save();
    } catch (error) {
      console.error("Failed to add domain to Vercel:", error);
      // Update project status to failed
      project.domainStatus = "failed";
      await project.save();
      throw new Error("Failed to add domain to Vercel. Please try again.");
    }
  }

  return project;
};

// Get project by ID
export const getProjectById = async (id: string): Promise<IProject | null> => {
  return await Project.findById(id);
};

// Get project by subdomain
export const getProjectBySubdomain = async (
  subdomain: string
): Promise<IProject | null> => {
  const sanitized = sanitizeSubdomain(subdomain);
  return await Project.findOne({ subdomain: sanitized });
};

// Update project
export const updateProject = async (
  id: string,
  updates: Partial<Omit<IProject, "_id" | "createdAt" | "updatedAt">>
): Promise<IProject | null> => {
  return await Project.findByIdAndUpdate(id, updates, { new: true });
};

// Get project by custom domain
export const getProjectByCustomDomain = async (
  domain: string
): Promise<IProject | null> => {
  return await Project.findOne({ customDomain: domain });
};

// Update project domain status
export const updateDomainStatus = async (
  id: string,
  status: "pending" | "added" | "verified" | "failed"
): Promise<IProject | null> => {
  return await Project.findByIdAndUpdate(
    id,
    { domainStatus: status },
    { new: true }
  );
};

// Check if custom domain is available
export const isCustomDomainAvailable = async (
  domain: string
): Promise<boolean> => {
  const existingProject = await getProjectByCustomDomain(domain);
  return !existingProject;
};

// Export all functions as a single service object
export const projectService = {
  isSubdomainAvailable,
  createProject,
  getProjectById,
  getProjectBySubdomain,
  updateProject,
  getProjectByCustomDomain,
  updateDomainStatus,
  isCustomDomainAvailable,
};

export default projectService;
