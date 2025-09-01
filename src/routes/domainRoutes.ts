import { Router } from "express";
import {
  addCustomDomain,
  verifyDomain,
  removeCustomDomain,
  checkDomainAvailability,
  getDomainVerificationInstructions,
} from "../controllers/DomainController";

const router = Router();

// Add custom domain to project
// POST /api/domains
router.post("/", addCustomDomain);

// Verify domain ownership
// POST /api/domains/:projectId/verify
router.post("/:projectId/verify", verifyDomain);

// Remove custom domain from project
// DELETE /api/domains/:projectId
router.delete("/:projectId", removeCustomDomain);

// Check domain availability
// GET /api/domains/check/:domain
router.get("/check/:domain", checkDomainAvailability);

// Get domain verification instructions
// GET /api/domains/instructions/:domain
router.get("/instructions/:domain", getDomainVerificationInstructions);

export default router;
