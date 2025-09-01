import { Router } from "express";
import {
  createProject,
  getProjectBySubdomain,
} from "../controllers/ProjectController";

const router = Router();

// Create a new project
// POST /api/projects
router.post("/", createProject);

// Get project by subdomain
// GET /api/projects/:subdomain
router.get("/:subdomain", getProjectBySubdomain);

export default router;
