import { Router } from "express";
import {
  createProject,
  getProjectBySubdomain,
  checkSubdomainAvailability,
} from "../controllers/ProjectController";

const router = Router();

// Create a new project
// POST /api/projects
router.post("/", createProject);

// Check subdomain availability
// GET /api/projects/check/:subdomain
router.get("/check/:subdomain", checkSubdomainAvailability);

// Get project by subdomain
// GET /api/projects/:subdomain
router.get("/:subdomain", getProjectBySubdomain);

export default router;
