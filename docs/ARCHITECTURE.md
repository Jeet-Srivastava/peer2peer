# System Architecture

## Overview
peer2peer is a Full-Stack application following a standard MERN (MongoDB, Express, React, Node.js) architecture. It utilizes a RESTful API approach for communication between the strictly decoupled frontend and backend. The application is deployed on **AWS ECS Fargate** with a fully automated CI/CD pipeline.

## High-Level Architecture

```mermaid
graph TD
    Client[Client Browser / React App] -->|HTTP/REST| API[Express API Server]
    API -->|Mongoose ODM| DB[(MongoDB Atlas)]
    
    subgraph Frontend [React Application - Vite]
        UI([Components & Pages])
        Context([Auth Context])
        Services([Axios API Service])
        UI <--> Context
        UI <--> Services
    end
    
    subgraph Backend [Node.js / Express]
        Router([Express Router])
        Controllers([Controllers])
        Services_BE([Business Logic & Utilities])
        Models([Mongoose Models])
        Router --> Controllers
        Controllers --> Services_BE
        Controllers --> Models
    end
    
    Client -.-> Frontend
    API -.-> Backend
```

## Deployment Architecture (AWS)

```mermaid
graph LR
    subgraph GitHub
        Repo[Repository] --> Actions[GitHub Actions]
    end
    
    subgraph AWS
        ECR[ECR Registry]
        
        subgraph ECS [ECS Fargate Cluster]
            Task[Backend Task<br/>Node.js:8000]
        end
        
        SSM[SSM Parameter Store<br/>MONGO_URI, JWT_SECRET]
        CW[CloudWatch Logs<br/>/ecs/peer2peer-backend]
    end
    
    Actions -->|Build & Push| ECR
    Actions -->|Deploy| ECS
    ECR -->|Pull Image| Task
    SSM -->|Inject Secrets| Task
    Task -->|Stream Logs| CW
    Task -->|Health Check| Task
```

## Component Roles

### Frontend (React + Vite)
- **State Management:** React Context API (`AuthContext`) manages user sessions comprehensively.
- **Routing:** `react-router-dom` handles page navigation and protects routes (e.g., creating a listing requires authentication).
- **Styling:** Custom CSS focusing on a clean, light, and minimalist user experience.
- **Production Serving:** Nginx serves the static build with SPA routing, gzip compression, and aggressive asset caching.

### Backend (Node.js + Express)
- **API Endpoints:** RESTful structured endpoints located under `/api/products`, `/api/auth`, `/api/upload`, and `/api/payments`.
- **Validation:** Enforced primarily through Mongoose schema validation.
- **Authentication:** JWT (JSON Web Tokens) are generated upon login/registration and validated via middleware (`authMiddleware.js`) for protected routes.
- **Storage:** Product images are handled via Multer and stored locally in the `/uploads` directory on the server.
- **Health Check:** `GET /` returns `"peer2peer API is running..."` — used by both Docker and ECS health checks.

### Database (MongoDB Atlas)
- **Schema-Based ODM:** Mongoose enforces relationships between Users and Products (One-to-Many).
- **Cloud-Hosted:** MongoDB Atlas provides a managed, scalable database accessible from ECS Fargate.

### CI/CD Pipeline
- **CI Gate:** Linting, testing, and frontend builds must pass before any deployment.
- **Docker:** Multi-stage Dockerfiles produce minimal production images.
- **ECR:** Docker images are tagged with both the Git commit SHA (traceability) and `latest` (convenience).
- **ECS Fargate:** Serverless container orchestration with rolling deployments — no EC2 instances to manage.
- **CloudWatch:** Centralized logging with 30-day retention for cost control.
- **SSM Parameter Store:** Application secrets are injected at runtime, never baked into images.
