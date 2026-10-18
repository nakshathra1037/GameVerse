import React from 'react';
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Navbar from './components/layout/Navbar';
import ProtectedRoute from './components/layout/ProtectedRoute';

import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ReflexRushPage from './pages/ReflexRushPage';
import GamePlaceholderPage from './pages/GamePlaceholderPage';
import NotFound from './pages/NotFound';
import { GAMES } from './games';

// Dynamically renders the mini-game matching the route slug, or placeholder if unknown
const GamePageDispatcher = () => {
  const { slug } = useParams();
  const GameComponent = GAMES[slug];

  if (!GameComponent) {
    return <GamePlaceholderPage />;
  }

  return (
    <div className="min-h-screen pb-16">
      <GameComponent />
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <div className="min-h-screen flex flex-col bg-[#07090e] text-slate-100 selection:bg-cyan-500 selection:text-black">
            {/* Main Top Navigation */}
            <Navbar />

            {/* Main Content Area */}
            <main className="flex-1">
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Protected Routes */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/games/reflex-rush"
                  element={
                    <ProtectedRoute>
                      <ReflexRushPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/games/:slug"
                  element={
                    <ProtectedRoute>
                      <GamePageDispatcher />
                    </ProtectedRoute>
                  }
                />

                {/* 404 Catch-All */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>

            {/* Footer */}
            <footer className="glass-panel border-t border-white/5 py-8 mt-12 text-center text-xs text-slate-500">
              <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="font-heading font-bold text-slate-300 tracking-wider">
                    GAME<span className="text-cyan-400">VERSE</span>
                  </span>
                  <span>• Gamified Mini-Game Arena & Progression</span>
                </div>
                <div className="flex items-center gap-4 text-slate-400">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800/80 border border-white/5 text-[11px] text-cyan-400 font-medium">
                    5 Mini-Games Arena Active
                  </span>
                  <span>FastAPI + MongoDB Beanie + React Vite</span>
                </div>
              </div>
            </footer>
          </div>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
