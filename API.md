# Tokly Backend API Documentation

## Overview

This is the backend API for the Tokly application, providing endpoints for project creation and management.

## Base URL

- Development: `http://localhost:8000`
- Production: `https://tokly-backend.vercel.app`

## API Endpoints

### Health Check

- **GET** `/health` - Check server health
- **GET** `/api/status` - Check API status

### Projects

#### Create Project

- **POST** `/api/projects`
- **Body:**
  ```json
  {
    "projectName": "my-awesome-project",
    "emoji": "🚀",
    "description": "Optional description"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "project": {
      "id": "unique-id",
      "name": "my-awesome-project",
      "subdomain": "my-awesome-project",
      "emoji": "🚀",
      "description": "Welcome to my-awesome-project.tokly.io!",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    "message": "Project created successfully"
  }
  ```

#### Get Project by Subdomain

- **GET** `/api/projects/:subdomain`
- **Response:**
  ```json
  {
    "success": true,
    "project": {
      "id": "unique-id",
      "name": "my-awesome-project",
      "subdomain": "my-awesome-project",
      "emoji": "🚀",
      "description": "Welcome to my-awesome-project.tokly.io!",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
  ```

#### Get All Projects

- **GET** `/api/projects`
- **Response:**
  ```json
  {
    "success": true,
    "projects": [...],
    "count": 5
  }
  ```

#### Check Subdomain Availability

- **GET** `/api/projects/check/:subdomain`
- **Response:**
  ```json
  {
    "success": true,
    "subdomain": "my-awesome-project",
    "available": true,
    "message": "Subdomain is available"
  }
  ```

#### Get Project Statistics

- **GET** `/api/projects/stats`
- **Response:**
  ```json
  {
    "success": true,
    "stats": {
      "totalProjects": 5,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
  ```

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "error": "Error type",
  "message": "Detailed error message"
}
```

### Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `404` - Not Found
- `409` - Conflict (e.g., subdomain already taken)
- `500` - Internal Server Error

## Validation Rules

### Project Name

- Required field
- Must be a non-empty string
- Maximum 50 characters
- Can contain letters, numbers, spaces, and hyphens
- Will be sanitized to create subdomain (lowercase, hyphens only)

### Emoji

- Required field
- Must be a non-empty string
- Basic emoji validation

### Description

- Optional field
- Maximum 500 characters
- Will be trimmed

## CORS Configuration

The API is configured to accept requests from:

- `https://tokly-frontend.vercel.app`
- `http://localhost:3000`
- `https://tokly.io`

## Development

### Running the Server

```bash
npm run dev
```

### Building

```bash
npm run build
```

### Production

```bash
npm start
```
