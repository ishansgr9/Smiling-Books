# Handover & Production Deployment Guide
## Smiling Books Digital Library | Akshar Paaul NGO

This document provides step-by-step instructions for deploying, configuring, and handing over the **Smiling Books Digital Library** production infrastructure across **Vercel** (Frontend), **Render** (Backend API), **Cloudflare R2** (Object Storage), and **Neon DB** (PostgreSQL Database).

---

## 1. Managed Infrastructure Overview

| Infrastructure Component | Provider | Role / Description |
| :--- | :--- | :--- |
| **Frontend Application** | **Vercel** | React SPA (Vite + TypeScript + Tailwind CSS v4) with global CDN distribution. |
| **Backend REST API** | **Render** | Go (Golang) compiled binary service running stateless HTTP handlers. |
| **Relational Database** | **Neon DB** | Serverless PostgreSQL database storing metadata, books, authors, users, and logs. |
| **Object Storage** | **Cloudflare R2** | S3-compatible cloud storage bucket for PDF book documents & cover images. |

---

## 2. Step 1: Database Provisioning (Neon DB PostgreSQL)

1. **Create Neon Project**:
   - Log in to the [Neon Console](https://console.neon.tech/).
   - Click **New Project** and name it `smiling-books-db`.
   - Select your preferred cloud region (e.g., `aws-ap-south-1` Mumbai or closest to readers).

2. **Obtain Connection String**:
   - Navigate to **Dashboard** → **Connection Details**.
   - Copy the PostgreSQL connection string. Ensure it uses `Pooled connection` and ends with `?sslmode=require`.
   - *Example Format*:
     ```text
     postgres://alex_owner:Secr3tPass@ep-cool-mountain-a5xyz.ap-south-1.aws.neon.tech/neondb?sslmode=require
     ```
   - Save this string as `DATABASE_URL`.

---

## 3. Step 2: Object Storage Setup (Cloudflare R2)

1. **Create Bucket**:
   - Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/) → **R2 Object Storage**.
   - Click **Create Bucket**, name it `smiling-books-storage`, and click **Create Bucket**.

2. **Generate API Access Keys**:
   - In the R2 Overview menu, click **Manage R2 API Tokens** on the right panel.
   - Click **Create API Token**.
   - Set **Permissions**: `Edit` (Read & Write access).
   - Click **Create API Token**.
   - Record the following credentials:
     - **Account ID** (found on the right sidebar of the R2 main page)
     - **Access Key ID**
     - **Secret Access Key**
     - **S3 Endpoint URL** (Format: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`)

3. **Configure CORS Bucket Policy**:
   - Navigate to `smiling-books-storage` bucket → **Settings** → **CORS Policy**.
   - Add the following JSON rule to allow file uploads from your Vercel & Render origins:
     ```json
     [
       {
         "AllowedOrigins": [
           "https://*.vercel.app",
           "https://*.onrender.com",
           "http://localhost:5173"
         ],
         "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
         "AllowedHeaders": ["*"],
         "ExposeHeaders": ["ETag"],
         "MaxAgeSeconds": 3600
       }
     ]
     ```

---

## 4. Step 3: Backend API Deployment (Render)

1. **Connect GitHub Repository**:
   - Log in to [Render Dashboard](https://dashboard.render.com/).
   - Click **New +** → **Web Service**.
   - Connect your GitHub repository `Smiling-Books`.

2. **Service Configuration**:
   - **Name**: `smiling-books-backend`
   - **Region**: Select region closest to Neon DB (e.g. Singapore / Frankfurt / Oregon).
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Go`
   - **Build Command**:
     ```bash
     go build -o bin/server cmd/server/main.go
     ```
   - **Start Command**:
     ```bash
     ./bin/server
     ```

3. **Environment Variables Configuration**:
   Add the following variables in the Render **Environment** settings:

   | Key | Example / Value | Description |
   | :--- | :--- | :--- |
   | `PORT` | `8080` | Service internal HTTP port |
   | `DATABASE_URL` | `postgres://user:pass@ep-xyz.neon.tech/neondb?sslmode=require` | Neon DB connection string |
   | `JWT_SECRET` | `a_very_long_secure_random_string_32_chars_min` | JWT token signing key |
   | `FRONTEND_URL` | `https://smiling-books.vercel.app` | Production Vercel domain for CORS |
   | `USE_LOCAL_STORAGE` | `false` | Disables local filesystem; enables Cloudflare R2 |
   | `R2_ACCOUNT_ID` | `6a89c...` | Cloudflare Account ID |
   | `R2_ACCESS_KEY_ID` | `8f2a1...` | R2 API Access Key ID |
   | `R2_SECRET_ACCESS_KEY` | `99ef4...` | R2 API Secret Access Key |
   | `R2_BUCKET_NAME` | `smiling-books-storage` | R2 Bucket name |
   | `R2_ENDPOINT` | `https://6a89c....r2.cloudflarestorage.com` | Cloudflare S3 Endpoint URL |

4. **Deploy & Auto-Migrate**:
   - Click **Create Web Service**.
   - Upon startup, the Go backend will automatically execute schema migrations and seed default categories & initial books into Neon DB.
   - Record your public API URL (e.g., `https://smiling-books-backend.onrender.com`).

5. **Creating Additional Production Administrators**:
   - To create a new administrator account on the live server, use Render's **Shell** tab or run locally targeting the remote DB:
     ```bash
     cd backend
     go run cmd/server/main.go -create-admin -name "Akshar Coordinator" -email "coordinator@aksharpaaul.org" -password "SecurePass2026!"
     ```

---

## 5. Step 4: Frontend Application Deployment (Vercel)

1. **Import Repository**:
   - Log in to [Vercel Dashboard](https://vercel.com/) → **Add New...** → **Project**.
   - Import your GitHub repository `Smiling-Books`.

2. **Project Build Settings**:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build` (or `npx vite build`)
   - **Output Directory**: `dist`

3. **Environment Variables**:
   - Add the following variable:
     - `VITE_API_BASE_URL` = `https://smiling-books-backend.onrender.com` (Your Render API URL)

4. **Client Routing Configuration (`vercel.json`)**:
   Ensure `frontend/vercel.json` exists with single-page app rewrite rules:
   ```json
   {
     "rewrites": [
       { "source": "/(.*)", "destination": "/index.html" }
     ]
   }
   ```

5. **Deploy**:
   - Click **Deploy**. Vercel will build and assign a domain (e.g. `https://smiling-books.vercel.app`).

---

## 6. Post-Deployment Verification & Testing Checklist

- [ ] **Public Catalog**: Visit `https://smiling-books.vercel.app/library`. Verify categories, search bar, and age group filters populate correctly.
- [ ] **PDF Reader**: Open a book details page and click **Read Online**. Verify the PDF renders smoothly in portrait/landscape on desktop and mobile phones.
- [ ] **Admin Authentication**:
  1. Navigate to `/admin/login`.
  2. Log in using default administrator credentials:
     - **Email**: `admin@smilingbooks.org`
     - **Password**: `AdminSmilingBooks2026!`
  3. Verify token issue and redirection to `/admin/dashboard`.
- [ ] **Book Management Test**:
  1. Create a test book under **Manage Books** → **Add New Book**.
  2. Upload a cover image (.jpg/.png) and PDF document (.pdf).
  3. Toggle **Publish** state and verify it appears in the public catalog.
  4. Delete the test book and confirm database & Cloudflare R2 cleanup.

---

## 7. Handover Contact & Support Information

- **NGO Organization**: Akshar Paaul NGO, Pune, India
- **Program**: Smiling Books Digital Library Initiative
- **Website**: [aksharpaaul.org](https://www.aksharpaaul.org)
- **Technical Maintenance Repository**: [`ishansgr9/Smiling-Books`](https://github.com/ishansgr9/Smiling-Books)
