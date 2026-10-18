# 🎮 GameVerse

GameVerse is a gamified web application platform where users play skill-based mini-games, earn XP & coins, unlock achievements, and compete on global and weekly leaderboards.

---

## 🛠️ Tech Stack

- **Frontend**: React 19 (Vite), Tailwind CSS v4, React Router v7, Axios, Lucide Icons, Context API
- **Backend**: Python 3.12, FastAPI, Uvicorn, Pydantic v2
- **Database**: MongoDB 8.x with Motor (Async driver) & Beanie ODM
- **Authentication**: JWT (`PyJWT`) + `bcrypt` password hashing
- **Testing**: `pytest`, `pytest-asyncio`, `httpx`

---

## 📁 Project Structure

```text
GameVerse/
├── client/                     # Frontend: React (Vite) + Tailwind CSS
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/         # Button, Card, Input, Modal, LoadingSpinner
│   │   │   └── layout/         # Navbar, ProtectedRoute
│   │   ├── context/            # AuthContext (state management)
│   │   ├── services/           # Axios instance & Auth API service
│   │   ├── pages/              # Home, Login, Register, Dashboard, NotFound
│   │   ├── App.jsx             # Router and layout configuration
│   │   ├── main.jsx            # React root
│   │   └── index.css           # Global theme, glassmorphism, glowing aesthetics
│   ├── vite.config.js          # Vite config with proxy to backend
│   └── package.json
└── server/                     # Backend: FastAPI + Beanie ODM
    ├── app/
    │   ├── core/               # Settings, MongoDB init, Bcrypt/JWT security
    │   ├── models/             # Beanie ODM models (User collection)
    │   ├── schemas/            # Pydantic request/response schemas
    │   ├── services/           # Authentication and business logic
    │   ├── routers/            # Auth endpoints (/api/auth) & Health check
    │   └── main.py             # FastAPI entrypoint with CORS
    ├── tests/                  # Backend integration tests
    ├── requirements.txt
    └── .env.example
```

---

## 🚀 Setup & Run Instructions

### 1. Prerequisites
- **Python**: 3.10+ (tested on Python 3.12)
- **Node.js**: v18+ (tested on v24)
- **MongoDB**: Running locally at `mongodb://localhost:27017` (default Windows MongoDB Service)

---

### 2. Backend Setup (`server/`)

1. Open a terminal in `server/`:
   ```bash
   cd server
   ```

2. Create and activate a Python virtual environment:
   ```powershell
   # Windows PowerShell
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment variables (a default `.env` is already provided):
   ```bash
   cp .env.example .env
   ```

5. Run integration tests:
   ```bash
   pytest -v tests/test_auth.py
   ```

6. Start the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   API Docs will be live at: [http://localhost:8000/docs](http://localhost:8000/docs)

---

### 3. Frontend Setup (`client/`)

1. Open a second terminal in `client/`:
   ```bash
   cd client
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   The client will be running at: [http://localhost:5173](http://localhost:5173)

---

## 🔒 Stage 1 Features & Endpoints

- **`POST /api/auth/register`**: Registers a new player with unique username and email, awards **50 starter bonus coins**, sets **Level 1**, hashes password with `bcrypt`, and returns JWT access token.
- **`POST /api/auth/login`**: Authenticates with username or email + password, returns JWT token and player profile.
- **`GET /api/auth/me`**: Protected endpoint returning authenticated player data.
- **`GET /api/health`**: Verifies backend and MongoDB connectivity.
- **Frontend**: Full dark-themed gaming UI with responsive Navbar, live player stats, avatar selection, protected routes, and session restore.
