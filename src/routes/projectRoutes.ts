import { Router } from "express";
import {
  createProject,
  getProjectBySubdomain,
  getAllProjects,
  checkSubdomainAvailability,
  getProjectStats,
} from "../controllers/ProjectController";

const router = Router();

// Create a new project
// POST /api/projects
router.post("/", createProject);

// Get project by subdomain
// GET /api/projects/:subdomain
router.get("/:subdomain", getProjectBySubdomain);

// Get all projects (for admin purposes)
// GET /api/projects
router.get("/", getAllProjects);

// Check if subdomain is available
// GET /api/projects/check/:subdomain
router.get("/check/:subdomain", checkSubdomainAvailability);

// Get project statistics
// GET /api/projects/stats
router.get("/stats", getProjectStats);

export default router;
