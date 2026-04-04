#!/bin/bash
# MediClear AI — One-command startup script
set -e

echo ""
echo "╔══════════════════════════════════════╗"
echo "║       MediClear AI — Starting        ║"
echo "╚══════════════════════════════════════╝"
echo ""

# ── Backend ────────────────────────────────────
echo "▶  Setting up backend..."
cd "$(dirname "$0")/backend"

if [ ! -d "venv" ]; then
  echo "   Creating virtual environment..."
  python3 -m venv venv
fi

source venv/bin/activate

echo "   Installing Python dependencies..."
pip install -r requirements.txt -q

if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "   ⚠️  Created .env from example. Edit it to add your OPENAI_API_KEY."
fi

echo "   Starting FastAPI server on :8000..."
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

# ── Frontend ───────────────────────────────────
echo ""
echo "▶  Setting up frontend..."
cd "../frontend"

if [ ! -d "node_modules" ]; then
  echo "   Installing npm packages (first run only)..."
  npm install
fi

echo "   Starting React dev server on :3000..."
npm run dev &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"

# ── Done ───────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  ✅  MediClear AI is running!                ║"
echo "║                                              ║"
echo "║  🌐  App       →  http://localhost:3000      ║"
echo "║  📖  API docs  →  http://localhost:8000/api/docs ║"
echo "║                                              ║"
echo "║  Demo logins:                                ║"
echo "║  Patient: rahul@example.com / patient123     ║"
echo "║  Doctor:  doctor@example.com / doctor123     ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "Press Ctrl+C to stop both servers."

trap "echo ''; echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
