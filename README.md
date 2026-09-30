# Smiling Books Digital Library
### An Educational Initiative by Akshar Paaul NGO

[![React](https://img.shields.io/badge/Frontend-React_19_%7C_Vite_8_%7C_Tailwind_v4-blue)](https://react.dev/)
[![Go Backend](https://img.shields.io/badge/Backend-Go_1.22+_REST_API-00ADD8)](https://go.dev/)
[![Database](https://img.shields.io/badge/Database-NeonDB_PostgreSQL-00e599)](https://neon.tech/)
[![Storage](https://img.shields.io/badge/Storage-Cloudflare_R2_Object_Storage-f38020)](https://www.cloudflare.com/developer-platform/r2/)

The **Smiling Books Digital Library** is an open-access digital learning platform developed for **Akshar Paaul NGO** (Pune, India). It provides a child-safe, legally compliant repository of storybooks, educational materials, and multi-lingual literature for under-resourced communities.

---

## Technical Documentation Index

Comprehensive technical documentation, deployment handover manuals, architecture specifications, and API guides are maintained in the [`docs/`](./docs) directory:

- **[Handover & Production Deployment Guide](./docs/HANDOVER_DEPLOYMENT.md)**: Complete step-by-step setup for Vercel, Render, Cloudflare R2, Neon DB PostgreSQL, environment secrets, and initial admin creation.
- **[System Architecture Specification](./docs/ARCHITECTURE.md)**: Software architecture diagrams, database ERD, data flows, copyright compliance engine, and mobile responsive subsystem.
- **[REST API Reference Documentation](./docs/API_REFERENCE.md)**: Full API endpoint specifications, JSON payload schemas, status codes, and JWT authentication headers.
- **[Local Development & CLI Guide](./docs/DEVELOPMENT_GUIDE.md)**: Local installation workflow, environment variables, CLI flags (`-migrate`, `-seed`, `-create-admin`), and Vite scripts.

---

## System Architecture Overview

```mermaid
graph TD
    Client[React SPA - Vercel / Mobile / Desktop] -->|HTTPS REST Requests| Backend[Go REST API - Render Service]
    Backend -->|JWT Auth / CORS Middleware| Handlers[HTTP Handlers & Business Rules]
    Handlers -->|Relational Queries & Reading Logs| NeonDB[(Neon DB PostgreSQL)]
    Handlers -->|Presigned URLs & Stream Proxy| R2Storage[Cloudflare R2 Object Storage]
    R2Storage -->|PDF Document & Cover Streams| Client
```

---

## Technology Stack

| Layer | Technology | Key Libraries / Frameworks |
| :--- | :--- | :--- |
| **Frontend SPA** | React 19 + TypeScript | Vite 8, Tailwind CSS v4, Lucide React, React PDF (`pdfjs-dist`) |
| **Backend REST API** | Go (Golang 1.22+) | Standard `net/http` router, `pgxpool`, `golang.org/x/crypto/bcrypt` |
| **Relational Database** | PostgreSQL | Serverless Neon DB PostgreSQL cluster |
| **Object Storage** | Cloudflare R2 / Disk | `aws-sdk-go-v2` S3-compatible API (with local disk fallback) |
| **Authentication** | JWT | Custom Go JWT stateless auth middleware |

---

## Environment Variables Summary

Environment variable templates are provided at root and subproject levels:
- Master Template: [`.env.example`](./.env.example)
- Backend Template: [`backend/.env.example`](./backend/.env.example)
- Frontend Template: [`frontend/.env.example`](./frontend/.env.example)

### Key Variables Matrix
```ini
# Backend API (Render / Local)
PORT=8080
DATABASE_URL=postgres://username:password@hostname:5432/dbname?sslmode=require
JWT_SECRET=super_secret_jwt_signing_key_change_this_in_production_32chars!
FRONTEND_URL=http://localhost:5173

# Storage (Cloudflare R2)
USE_LOCAL_STORAGE=false
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=smiling-books-storage
R2_ENDPOINT=https://your_account_id.r2.cloudflarestorage.com

# Frontend Client (Vercel / Local)
VITE_API_BASE_URL=http://localhost:8080
```

---

## Local Development Setup

### 1. Backend API (Go)
```bash
cd backend
cp .env.example .env

# Run database schema migrations & seed default records
go run cmd/server/main.go -migrate -seed

# Start the local development server (http://localhost:8080)
go run cmd/server/main.go
```

### 2. Frontend Client (React)
```bash
cd frontend
cp .env.example .env.local
npm install

# Start Vite dev server (http://localhost:5173 - accessible on local network)
npm run dev
```

---

## Default Administrator Credentials

Upon running the seeder (`go run cmd/server/main.go -seed`), the following account is provisioned:
- **Email**: `admin@smilingbooks.org`
- **Password**: `AdminSmilingBooks2026!`

---

## Organization & Licensing

- **NGO Organization**: Akshar Paaul NGO, Pune, Maharashtra, India
- **Program**: Smiling Books Digital Library Project
- **Website**: [aksharpaaul.org](https://www.aksharpaaul.org)
