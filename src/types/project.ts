export interface Project {
  _id: string;
  projectName: string;
  subdomain: string;
  customDomain?: string;
  emoji: string;
  domainStatus?: "pending" | "added" | "verified" | "failed";
  createdAt: Date;
  updatedAt: Date;
}

// Helper function to convert IProject to Project
export const convertIProjectToProject = (iProject: any): Project => {
  return {
    _id: iProject._id.toString(),
    projectName: iProject.projectName,
    subdomain: iProject.subdomain,
    customDomain: iProject.customDomain,
    emoji: iProject.emoji,
    domainStatus: iProject.domainStatus,
    createdAt: iProject.createdAt,
    updatedAt: iProject.updatedAt,
  };
};

export interface CreateProjectRequest {
  projectName: string;
  emoji: string;
  description?: string;
  customDomain?: string;
  useCustomDomain?: boolean;
}

export interface CreateProjectResponse {
  success: boolean;
  project: Project;
  message: string;
  domainSetup?: DomainSetupInstructions;
}

export interface DomainSetupInstructions {
  domain: string;
  verified: boolean;
  dnsRecords: {
    type: string;
    domain: string;
    value: string;
    reason: string;
  }[];
  instructions: {
    title: string;
    steps: string[];
    note?: string;
  };
}

export interface GetProjectResponse {
  success: boolean;
  project: Project;
}

export interface ErrorResponse {
  success: false;
  error: string;
  message?: string;
}

export interface VercelDomainResponse {
  name: string;
  apexName: string;
  projectId: string;
  redirect?: string;
  redirectStatusCode?: number;
  gitBranch?: string;
  updatedAt?: number;
  createdAt?: number;
  verified?: boolean;
  verification?: {
    type: string;
    domain: string;
    value: string;
    reason: string;
  }[];
}

export interface AddDomainRequest {
  domain: string;
  projectId: string;
}

export interface DomainVerificationRequest {
  domain: string;
  projectId: string;
}
