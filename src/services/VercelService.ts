import axios from "axios";
import { config } from "../config";
import {
  VercelDomainResponse,
  AddDomainRequest,
  DomainVerificationRequest,
} from "../types/project";

export class VercelService {
  private static readonly baseURL = config.vercel.apiUrl;
  private static readonly apiToken = config.vercel.apiToken;
  private static readonly projectId = config.vercel.projectId;

  private static getHeaders() {
    return {
      Authorization: `Bearer ${this.apiToken}`,
      "Content-Type": "application/json",
    };
  }

  /**
   * Add a custom domain to a Vercel project
   * Uses the correct Vercel API v9 endpoint as per documentation
   */
  static async addDomain(domain: string): Promise<VercelDomainResponse> {
    try {
      const response = await axios.post<VercelDomainResponse>(
        `${this.baseURL}/v9/projects/${this.projectId}/domains`,
        { name: domain },
        { headers: this.getHeaders() }
      );

      return response.data;
    } catch (error: any) {
      console.error(
        "Error adding domain to Vercel:",
        error.response?.data || error.message
      );
      throw new Error(
        error.response?.data?.error?.message || "Failed to add domain to Vercel"
      );
    }
  }

  /**
   * Get domain information from Vercel
   * Uses the correct Vercel API v9 endpoint as per documentation
   */
  static async getDomain(domain: string): Promise<VercelDomainResponse> {
    try {
      const response = await axios.get<VercelDomainResponse>(
        `${this.baseURL}/v9/projects/${this.projectId}/domains/${domain}`,
        { headers: this.getHeaders() }
      );

      return response.data;
    } catch (error: any) {
      console.error(
        "Error getting domain from Vercel:",
        error.response?.data || error.message
      );

      // Preserve the original error for proper handling in isDomainAvailable
      const errorMessage =
        error.response?.data?.error?.message ||
        "Failed to get domain information";
      const newError = new Error(errorMessage) as any;
      newError.response = error.response; // Preserve response for status code checking
      throw newError;
    }
  }

  /**
   * Verify domain ownership (triggers verification check)
   * Uses the correct Vercel API v9 endpoint as per documentation
   */
  static async verifyDomain(domain: string): Promise<VercelDomainResponse> {
    try {
      const response = await axios.post<VercelDomainResponse>(
        `${this.baseURL}/v9/projects/${this.projectId}/domains/${domain}/verify`,
        {},
        { headers: this.getHeaders() }
      );

      return response.data;
    } catch (error: any) {
      console.error(
        "Error verifying domain:",
        error.response?.data || error.message
      );
      throw new Error(
        error.response?.data?.error?.message || "Failed to verify domain"
      );
    }
  }

  /**
   * Check domain verification status using project-specific Vercel API endpoints
   * Uses v9/projects/{projectId}/domains/{domain} which should work with current token scope
   */
  static async checkDomainVerificationStatus(domain: string): Promise<{
    verified: boolean;
    verification: any[];
    configuration: any;
    usingVercelDNS: boolean;
    misconfigured: boolean;
  }> {
    try {
      // Get domain information from project-specific endpoint
      const domainResponse = await axios.get(
        `${this.baseURL}/v9/projects/${this.projectId}/domains/${domain}`,
        { headers: this.getHeaders() }
      );
      const domainInfo = domainResponse.data as any;

      const verified = domainInfo.verified || false;

      // Check if domain is actually using Vercel DNS by looking at verification records
      // If Vercel says it's verified, we need to double-check the DNS configuration
      let usingVercelDNS = false;

      if (verified) {
        // If Vercel says it's verified, check if it's actually using Vercel nameservers
        // We'll use a simple DNS lookup to check nameservers
        try {
          const dns = require("dns").promises;
          const nameservers = await dns.resolveNs(domain);
          const vercelNameservers = [
            "ns1.vercel-dns.com",
            "ns2.vercel-dns.com",
          ];

          usingVercelDNS = nameservers.some((ns: string) =>
            vercelNameservers.includes(ns.toLowerCase())
          );

          console.log(`DNS check for ${domain}:`, {
            nameservers,
            vercelNameservers,
            usingVercelDNS,
          });
        } catch (dnsError) {
          console.error(`DNS lookup failed for ${domain}:`, dnsError);
          // If DNS lookup fails, assume it's not using Vercel DNS
          usingVercelDNS = false;
        }
      }

      console.log(`Domain ${domain} verification status:`, {
        verified,
        usingVercelDNS,
        domainInfo: {
          name: domainInfo.name,
          apexName: domainInfo.apexName,
          verified: domainInfo.verified,
          verification: domainInfo.verification,
        },
      });

      return {
        verified,
        verification: domainInfo.verification || [],
        configuration: domainInfo,
        usingVercelDNS,
        misconfigured: false, // We can't check this with current token scope
      };
    } catch (error: any) {
      console.error(
        "Error checking domain verification status:",
        error.response?.data || error.message
      );

      // If we get a 404, the domain might not be added to the project yet
      if (error.response?.status === 404) {
        return {
          verified: false,
          verification: [],
          configuration: null,
          usingVercelDNS: false,
          misconfigured: false,
        };
      }

      throw new Error(
        error.response?.data?.error?.message ||
          "Failed to check domain verification status"
      );
    }
  }

  /**
   * Get domain setup information with Vercel nameservers
   * This method returns domain setup data with Vercel nameserver configuration
   */
  static async getDomainSetupInfo(domain: string): Promise<{
    verified: boolean;
    verification: any[];
    configuration: any;
    dnsRecords: any[];
  }> {
    try {
      // Get domain information
      const domainInfo = await this.getDomain(domain);

      // Return Vercel nameserver configuration
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

      console.log("Domain setup info for", domain, ":", {
        verified: false,
        verification: domainInfo.verification || [],
        dnsRecords: vercelNameservers,
      });

      return {
        verified: false, // Always show setup instructions initially
        verification: domainInfo.verification || [],
        configuration: domainInfo,
        dnsRecords: vercelNameservers,
      };
    } catch (error: any) {
      console.error(
        "Error getting domain setup info:",
        error.response?.data || error.message
      );

      // Return Vercel nameservers even if domain doesn't exist yet
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

      console.log(
        "Returning Vercel nameservers for",
        domain,
        ":",
        vercelNameservers
      );

      return {
        verified: false,
        verification: [],
        configuration: null,
        dnsRecords: vercelNameservers,
      };
    }
  }

  /**
   * Remove a domain from Vercel project
   */
  static async removeDomain(domain: string): Promise<void> {
    try {
      await axios.delete(
        `${this.baseURL}/v9/projects/${this.projectId}/domains/${domain}`,
        { headers: this.getHeaders() }
      );
    } catch (error: any) {
      console.error(
        "Error removing domain from Vercel:",
        error.response?.data || error.message
      );
      throw new Error(
        error.response?.data?.error?.message || "Failed to remove domain"
      );
    }
  }

  /**
   * List all domains for a project
   */
  static async listDomains(): Promise<VercelDomainResponse[]> {
    try {
      const response = await axios.get<{ domains: VercelDomainResponse[] }>(
        `${this.baseURL}/v9/projects/${this.projectId}/domains`,
        { headers: this.getHeaders() }
      );

      return response.data.domains;
    } catch (error: any) {
      console.error(
        "Error listing domains:",
        error.response?.data || error.message
      );
      throw new Error(
        error.response?.data?.error?.message || "Failed to list domains"
      );
    }
  }

  /**
   * Check if domain is available for use
   */
  static async isDomainAvailable(domain: string): Promise<boolean> {
    try {
      await this.getDomain(domain);
      return false; // Domain exists, not available
    } catch (error: any) {
      // Check if the error message indicates domain not found
      if (
        error.response?.status === 404 ||
        error.message?.includes("not_found") ||
        error.message?.includes("Project Domain not found")
      ) {
        return true; // Domain doesn't exist, available
      }
      throw error; // Other error, re-throw
    }
  }

  /**
   * Validate domain format
   */
  static validateDomain(domain: string): { isValid: boolean; error?: string } {
    if (!domain || domain.trim().length === 0) {
      return { isValid: false, error: "Domain is required" };
    }

    // Basic domain validation regex
    const domainRegex =
      /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

    if (!domainRegex.test(domain)) {
      return { isValid: false, error: "Invalid domain format" };
    }

    if (domain.length > 253) {
      return { isValid: false, error: "Domain is too long" };
    }

    // Check for reserved domains
    const reservedDomains = [
      "localhost",
      "vercel.app",
      "vercel.com",
      "now.sh",
      "amazonaws.com",
      "cloudfront.net",
      "herokuapp.com",
      "netlify.app",
      "github.io",
      "gitlab.io",
      "firebaseapp.com",
      "appspot.com",
      "azurewebsites.net",
      "heroku.com",
      "herokuapp.com",
      "railway.app",
      "render.com",
      "supabase.co",
      "supabase.in",
      "supabase.io",
      "supabase.com",
      "planetscale.com",
      "neon.tech",
      "cockroachlabs.cloud",
      "mongodb.com",
      "mongodb.net",
      "redis.com",
      "redis.io",
      "redis.net",
      "redis.org",
      "redis.dev",
      "redis.tech",
      "redis.cloud",
      "redis.labs",
      "redis.enterprise",
      "redis.inc",
      "redis.io",
      "redis.net",
      "redis.org",
      "redis.dev",
      "redis.tech",
      "redis.cloud",
      "redis.labs",
      "redis.enterprise",
      "redis.inc",
      "tokly.io", // Your main domain
    ];

    const domainParts = domain.toLowerCase().split(".");
    const tld = domainParts[domainParts.length - 1];
    const domainName = domainParts.slice(0, -1).join(".");

    if (reservedDomains.includes(domain.toLowerCase())) {
      return {
        isValid: false,
        error: "This domain is reserved and cannot be used",
      };
    }

    if (reservedDomains.includes(tld)) {
      return {
        isValid: false,
        error: "This TLD is reserved and cannot be used",
      };
    }

    return { isValid: true };
  }
}
