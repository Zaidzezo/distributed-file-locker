# Distributed File Locker

A distributed file storage system built with Node.js, TypeScript, React, MongoDB, and Docker. Files are fragmented across multiple storage nodes, with metadata tracked centrally and integrity verified through cryptographic hashing.

## Overview

**Distributed File Locker** is designed around a central application service and multiple independent storage nodes.

When a file is uploaded:

1. The central backend authenticates the user.
2. The file is divided into fragments.
3. Fragments are distributed across three storage nodes.
4. Metadata and fragment locations are stored in MongoDB.
5. Cryptographic hashes are used to verify data integrity.
6. Files can later be reconstructed from their distributed fragments.

The project demonstrates distributed storage concepts including multi-tenancy, data fragmentation, node management, integrity verification, and containerized infrastructure.

## Features

* **Multi-Tenancy** — Files and metadata are scoped to individual users.
* **Distributed Storage** — File fragments are distributed across three independent storage nodes.
* **Fragment Reconstruction** — Distributed fragments can be retrieved and reassembled into the original file.
* **Integrity Verification** — SHA-256 hashing is used to verify stored data.
* **Self-Healing** — The system can detect missing or damaged fragments and reconstruct data when possible.
* **Streaming File Operations** — Upload and download pipelines are designed to process file data without loading entire files into memory unnecessarily.
* **Atomic Deletion** — File deletion removes the associated metadata and distributed fragments.
* **JWT-Style Session Authentication** — Authenticated requests use signed session tokens.
* **Containerized Infrastructure** — MongoDB, the central backend, and storage nodes run through Docker Compose.

## Architecture

```text
                         ┌─────────────────────┐
                         │   React Frontend    │
                         │   localhost:5173    │
                         └──────────┬──────────┘
                                    │
                                    │ HTTP
                                    ▼
                         ┌─────────────────────┐
                         │   Central Backend   │
                         │   localhost:5000    │
                         │                     │
                         │ Authentication      │
                         │ File API            │
                         │ Cluster Manager     │
                         └──────┬───────┬──────┘
                                │       │
                    ┌───────────┘       └───────────┐
                    │                               │
                    ▼                               ▼
          ┌─────────────────┐             ┌─────────────────┐
          │    MongoDB      │             │ Storage Nodes   │
          │   Data Registry │             │                 │
          └─────────────────┘             │ ┌─────────────┐ │
                                          │ │   Node 1    │ │
                                          │ │   :3001     │ │
                                          │ └─────────────┘ │
                                          │ ┌─────────────┐ │
                                          │ │   Node 2    │ │
                                          │ │   :3002     │ │
                                          │ └─────────────┘ │
                                          │ ┌─────────────┐ │
                                          │ │   Node 3    │ │
                                          │ │   :3003     │ │
                                          │ └─────────────┘ │
                                          └─────────────────┘
```

### Components

| Component        | Technology                     | Purpose                                      |
| ---------------- | ------------------------------ | -------------------------------------------- |
| Frontend         | React + TypeScript + Vite      | User interface                               |
| Central Backend  | Node.js + Express + TypeScript | API, authentication, orchestration           |
| Database         | MongoDB                        | Users, file metadata, and fragment locations |
| Storage Nodes    | Node.js + Express + TypeScript | Store distributed file fragments             |
| Containerization | Docker + Docker Compose        | Local infrastructure                         |
| Linting          | Oxlint                         | Static analysis and code quality             |

## Project Structure

```text
distributed-file-locker/
├── backend/
│   ├── src/
│   ├── Dockerfile
│   └── .dockerignore
│
├── storage-node/
│   ├── src/
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── fragments-1/
│   ├── fragments-2/
│   └── fragments-3/
│
├── locker-frontend/
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
│
├── docker-compose.yml
├── .env.example
├── .dockerignore
└── README.md
```

## Tech Stack

### Backend

* Node.js
* TypeScript
* Express
* MongoDB
* Axios
* Socket.IO client
* UUID
* Node.js `crypto`

### Frontend

* React
* TypeScript
* Vite
* Tailwind CSS
* React Router
* Lucide React

### Infrastructure

* Docker
* Docker Compose
* MongoDB

### Tooling

* Oxlint
* TypeScript

## Getting Started

### Prerequisites

Install the following:

* [Git](https://git-scm.com/)
* [Node.js](https://nodejs.org/) 20 or later
* [Docker Desktop](https://www.docker.com/products/docker-desktop/)

Make sure Docker Desktop is running before starting the infrastructure.

---

## 1. Clone the Repository

```bash
git clone https://github.com/Zaidzezo/distributed-file-locker.git
cd distributed-file-locker
```

---

## 2. Configure Environment Variables

Create a `.env` file in the project root by copying the example:

```powershell
Copy-Item .env.example .env
```

Or on Linux/macOS:

```bash
cp .env.example .env
```

The `.env` file should contain:

```env
PORT=5000
NODE_ENV=development

MONGO_URI=mongodb://mongodb:27017/file_locker

JWT_SECRET=replace_with_a_long_random_secret
CLUSTER_SECRET=replace_with_a_long_random_secret

CLIENT_ORIGIN=http://localhost:5173
STORAGE_PATH=./uploads
```

### Important

Do **not** commit `.env` to Git.

Generate unique random values for `JWT_SECRET` and `CLUSTER_SECRET`.

The `MONGO_URI` above uses `mongodb` because Docker Compose provides that hostname to the backend container.

---

## 3. Start the Backend Infrastructure

From the project root:

```bash
docker compose up --build
```

This starts:

* MongoDB
* Central backend
* Storage node 1
* Storage node 2
* Storage node 3

The services are exposed as follows:

| Service         |               Host Port |
| --------------- | ----------------------: |
| Central Backend |                  `5000` |
| Storage Node 1  |                  `3001` |
| Storage Node 2  |                  `3002` |
| Storage Node 3  |                  `3003` |
| MongoDB         | Internal Docker network |

MongoDB is intentionally not exposed on a host port. The backend communicates with it through the Docker network.

### Run in the Background

If you don't want the logs attached to your terminal:

```bash
docker compose up --build -d
```

Check running containers:

```bash
docker compose ps
```

View logs:

```bash
docker compose logs -f
```

View only the backend logs:

```bash
docker compose logs -f central_brain
```

---

## 4. Start the Frontend

The frontend currently runs separately from Docker.

Open a **new terminal** and run:

```powershell
cd locker-frontend
npm install
npm run dev
```

Vite will start the frontend at:

```text
http://localhost:5173
```

Open that address in your browser.

The frontend communicates with the central backend at:

```text
http://localhost:5000
```

---

## 5. Running the Complete Application

You should have:

### Terminal 1 — Docker infrastructure

From the project root:

```bash
docker compose up --build
```

### Terminal 2 — Frontend

```powershell
cd locker-frontend
npm install
npm run dev
```

Then open:

```text
http://localhost:5173
```

The expected architecture is:

```text
Browser
   │
   ▼
React / Vite
localhost:5173
   │
   ▼
Central Backend
localhost:5000
   │
   ├──► MongoDB
   │
   ├──► Storage Node 1
   ├──► Storage Node 2
   └──► Storage Node 3
```

---

## Verification

### Check the Backend

Open:

```text
http://localhost:5000/health
```

A healthy backend should return a response similar to:

```json
{
  "status": "ONLINE"
}
```

### Check the Docker Services

```bash
docker compose ps
```

You should see containers for:

* `locker_crypto_registry`
* `locker_central_brain`
* `storage-node-1`
* `storage-node-2`
* `storage-node-3`

### Check Backend Logs

```bash
docker compose logs central_brain
```

The backend should report that the central brain is running on port `5000`.

---

## Development

### Frontend

```bash
cd locker-frontend
npm install
npm run dev
```

Build the frontend:

```bash
npm run build
```

Run Oxlint:

```bash
npm run lint
```

### Backend

The backend is normally run through Docker:

```bash
docker compose up --build central_brain
```

The backend Docker image compiles the TypeScript source and starts the generated server.

### Storage Nodes

Storage nodes are also built and started through Docker Compose:

```bash
docker compose up --build storage_node_1 storage_node_2 storage_node_3
```

---

## Stopping the Application

If Docker Compose is running in the foreground:

```text
Ctrl + C
```

If running in detached mode:

```bash
docker compose down
```

To stop the containers while preserving the MongoDB volume:

```bash
docker compose down
```

To also remove the MongoDB data volume:

```bash
docker compose down -v
```

**Warning:** `docker compose down -v` deletes the MongoDB Docker volume and therefore removes the stored application metadata.

---

## Storage

Each storage node has its own persistent fragment directory:

```text
storage-node/fragments-1/
storage-node/fragments-2/
storage-node/fragments-3/
```

Docker Compose mounts these directories into the corresponding containers:

```text
storage-node-1 → /app/fragments
storage-node-2 → /app/fragments
storage-node-3 → /app/fragments
```

MongoDB data is persisted through the `mongo_data` Docker volume.

---

## Security

The project uses several security mechanisms:

* Environment-based secrets
* Signed authentication tokens
* Password hashing using Node.js `scrypt`
* Tenant-scoped file access
* Cryptographic file hashing
* Docker isolation between services
* MongoDB kept on the internal Docker network
* `.env` files excluded from Docker build contexts

Secrets should always be supplied through environment variables rather than committed to source control.

For production deployments, additional hardening would be required, including stronger service-to-service authentication, HTTPS/TLS, production secret management, rate limiting, stricter CORS configuration, upload validation, and container hardening.

---

## Verification & Testing

Run the frontend lint checks:

```bash
cd locker-frontend
npm run lint
```

Build the frontend:

```bash
npm run build
```

Build all Docker services:

```bash
docker compose build
```

Start the complete backend infrastructure:

```bash
docker compose up
```

The application can then be tested through the frontend at:

```text
http://localhost:5173
```

Recommended manual verification includes:

1. Registering a user.
2. Logging in.
3. Uploading a file.
4. Confirming the file appears in the repository.
5. Downloading the file.
6. Verifying the downloaded file matches the original.
7. Renaming a file.
8. Deleting a file.
9. Checking the cluster/node status.
10. Restarting storage containers and verifying the system's recovery behavior.

---

## License

Distributed under the MIT License. See [`LICENSE`](./LICENSE) for more information.
