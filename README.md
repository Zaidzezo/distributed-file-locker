# Distributed File Locker

A high-performance, fault-tolerant distributed file locker application built with multi-tenancy, chunk-level data fragmentation, and background self-healing systems.

## Overview

The **Distributed File Locker** provides secure, scalable, and resilient file storage across distributed nodes. Files are fragmented into distinct data chunks, encrypted, and distributed across the network to guarantee data availability and privacy. Designed with a multi-tenant architecture, it ensures complete isolation and consistent state verification across all stored data.

## Features

- 🏢 **Multi-Tenancy Architecture**: Secure client isolation with scoped workspace permissions and access controls.
- 🧩 **Data Fragmentation & Reconstruction**: Files are automatically split into chunks during upload and seamlessly reassembled upon download.
- 🛡️ **Consistency Verification Pipeline**: Cryptographic hashing continuously audits data integrity to spot missing or corrupted fragments.
- 🩹 **Self-Healing Engine**: Automatically detects node failures or damaged chunks and reconstructs them in the background without downtime.
- ⚡ **Stream Uploads & Downloads**: Efficient chunk-streaming pipelines optimized for large file storage with minimal RAM overhead.
- 🧹 **Atomic Deletions**: Instant cascading deletes to remove all associated fragments across storage nodes clean and completely.

## Architecture & Tech Stack

- **Backend**: Node.js & Express
- **Frontend**: React.js & tailwind
- **Database**: MongoDB
- **Containerization**: Docker & Docker Compose
- **Security**: JWT Authentication, Tenant Isolation, Hash Verification (SHA-256)

---

## Getting Started

Follow these instructions to set up and run the distributed file locker on your local machine.

### Prerequisites

Make sure you have the following installed:
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Docker](https://www.docker.com/) & Docker Compose
- [Git](https://git-scm.com/)

---

### Installation & Setup


1. **Clone the repository:**
```bash
  git clone [https://github.com/your-username/distributed-file-locker.git](https://github.com/your-username/distributed-file-locker.git)
  cd distributed-file-locker
```
2. **Environment Configuration:**
Set up your `.env` files in both backend and frontend directories (or copy from examples if available):

```bash
# Server environment configuration (.env in /server)
PORT=5000
MONGO_URI=mongodb://localhost:27017/file_locker
JWT_SECRET=your_jwt_super_secret_key
NODE_ENV=development

# Client environment configuration (.env in /client)
REACT_APP_API_URL=http://localhost:5000/api
```
3. **Install Dependencies:**
Install required packages for both the backend server and frontend application:

```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies (React & Tailwind CSS)
cd ../client
npm install
```

### Running the Application

#### Option A: Running with Docker (Recommended)
Spin up the backend, React frontend, and MongoDB service in containerized environments with a single command:

```bash
# From the project root directory
docker-compose up --build
```

#### Option B: Running Locally
#### 1. Start MongoDB:

```bash
# Start a local MongoDB service or run an isolated container
docker run -d -p 27017:27017 --name locker-mongo mongo:latest
```
#### 2. Start the Backend API Server:

```bash
cd server
npm run dev
```
#### 3. Start the React Frontend App:
```bash
# Open a new terminal tab/window
cd client
npm start
```

## License

Distributed under the MIT License. See `LICENSE` for more information.
