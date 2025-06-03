# JEEPrep.tech Backend (Node.js + Express + SQLite)

This backend provides JWT authentication and REST API endpoints for users, questions, and attempts for the JEEPrep.tech platform.

## Features
- User registration and login (JWT-based)
- SQLite database for users, questions, and attempts
- REST API endpoints for authentication and user info
- Ready for extension with questions and attempts endpoints

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file (already provided):
   ```env
   JWT_SECRET=supersecretkey
   PORT=4000
   ```
3. Start the server:
   ```bash
   node server.js
   ```
4. The API will be available at `http://localhost:4000`

## API Endpoints
- `POST /api/register` — Register a new user
- `POST /api/login` — Login and receive JWT
- `GET /api/me` — Get current user info (requires Authorization header)

## Next Steps
- Add endpoints for questions and attempts
- Connect your React frontend to this backend
