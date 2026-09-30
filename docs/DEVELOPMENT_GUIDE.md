# Local Development & CLI Guide
## Smiling Books Digital Library | Akshar Paaul NGO

This guide provides setup instructions and CLI workflow commands for developers working on the **Smiling Books Digital Library** codebase.

---

## 1. Prerequisites

Before starting local development, ensure the following tools are installed on your workstation:

- **Go (Golang)**: Version `1.22+` ([golang.org](https://golang.org/dl/))
- **Node.js**: Version `18.0+` or `20.0+` ([nodejs.org](https://nodejs.org/))
- **Git**: Version `2.30+`

---

## 2. Environment Configuration Setup

1. Clone the repository and navigate to the project root:
   ```bash
   git clone https://github.com/ishansgr9/Smiling-Books.git
   cd Smiling-Books
   ```

2. Copy the root environment template:
   ```bash
   cp .env.example .env
   ```

3. Copy subproject environment templates:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env.local
   ```

---

## 3. Backend Development (Go Service)

### 3.1 Dependencies & Setup
Navigate to the `backend` folder:
```bash
cd backend
```

Download Go module dependencies:
```bash
go mod download
```

### 3.2 CLI Command Line Flags
The Go backend binary includes utility flags for database administration:

#### Run Schema Migrations & Exit:
```bash
go run cmd/server/main.go -migrate
```

#### Seed Default Data & Exit:
Creates standard categories, languages, author records, default administrator user, and 10 public domain sample books.
```bash
go run cmd/server/main.go -seed
```

#### Combine Migration & Seeding:
```bash
go run cmd/server/main.go -migrate -seed
```

#### Create New Administrator Account:
```bash
go run cmd/server/main.go -create-admin -name "Coordinator Name" -email "coord@aksharpaaul.org" -password "YourSecurePass123!"
```

### 3.3 Starting Local Development Server
To start the HTTP REST API server (runs auto-migration check automatically on boot):
```bash
go run cmd/server/main.go
```
The server will start listening on port `8080` at `http://localhost:8080`.

---

## 4. Frontend Development (React + Vite SPA)

### 4.1 Dependencies & Setup
Navigate to the `frontend` folder:
```bash
cd frontend
npm install
```

### 4.2 Development Server
Start Vite dev server (configured to bind to `0.0.0.0:5173` for mobile phone testing on local network):
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### 4.3 Testing Mobile Phone Connection on Local Network
1. Ensure your mobile phone is connected to the same Wi-Fi network as your computer.
2. Find your computer's local IP address (e.g. `192.168.1.15`).
3. Open `http://192.168.1.15:5173` in your phone browser.
4. The frontend will automatically route REST API requests to `http://192.168.1.15:8080`.

### 4.4 Production Build Verification
To test compiling the production JavaScript & CSS bundle:
```bash
npm run build
```

---

## 5. Default Administrator Credentials

When the seeder is executed, the following administrator account is created:
- **Email**: `admin@smilingbooks.org`
- **Password**: `AdminSmilingBooks2026!`
