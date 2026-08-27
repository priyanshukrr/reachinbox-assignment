# ReachInbox — Email Scheduling & Automation

A full-stack email campaign scheduling platform built with Express, TypeScript, PostgreSQL, BullMQ, Redis, and React.

## 🚀 Key Features

- **Delayed Email Scheduling**: Schedule campaign emails with configurable delays and rate limits.
- **Fault-Tolerant Queue**: BullMQ + Redis queue with exponential backoff retries.
- **Authentication**: Admin and User authentication profiles.
- **Real-Time Monitoring**: Live status tracking (`SCHEDULED`, `PROCESSING`, `SENT`, `FAILED`).
- **Modern UI Dashboard**: Clean SaaS interface inspired by modern design systems.

## 🛠️ Tech Stack

- **Backend**: Node.js, Express, TypeScript, Prisma ORM, BullMQ, Redis, Nodemailer
- **Frontend**: React 19, TypeScript, Vite
- **Infrastructure**: PostgreSQL, Redis (Docker Compose)

## 🏁 Quick Start

### 1. Infrastructure (PostgreSQL & Redis)
```bash
docker compose up -d
```

### 2. Backend & Worker
```bash
cd backend
npm install
npx prisma db push
npx ts-node prisma/seed.ts
npm run dev
npm run worker
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.
