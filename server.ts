/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';

const app = express();
const PORT = 3000;
const STATE_FILE = path.join(process.cwd(), 'tournament_state.json');

// Configure middleware for JSON parsing with 10mb limit for large logs and histories
app.use(express.json({ limit: '10mb' }));

// Initial default state representation
const defaultState = {
  players: [],
  matches: [],
  currentMatchId: null,
  round: 1,
  status: 'setup',
  config: {
    pointsToWin: 21,
    winByTwo: true,
    servesPerChange: 5,
    enableFourPointRule: true,
    enableGraceRule: true,
  },
  standingOverrides: {},
};

let tournamentState: any = { ...defaultState };

// Attempt to load tournament state from JSON file on server startup
try {
  if (fs.existsSync(STATE_FILE)) {
    const data = fs.readFileSync(STATE_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    if (parsed && Array.isArray(parsed.players) && Array.isArray(parsed.matches)) {
      tournamentState = parsed;
      console.log('Successfully loaded persisted tournament state from disk.');
    }
  }
} catch (err) {
  console.error('Error loading tournament state from file, fallback to default:', err);
}

// Core helper to save state safely to disk
function saveStateToDisk(state: any) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing tournament state to disk:', err);
  }
}

// REST API Endpoints for tournament state synchronization
app.get('/api/tournament-state', (req, res) => {
  res.json(tournamentState);
});

app.post('/api/tournament-state', (req, res) => {
  const updated = req.body;
  if (updated && Array.isArray(updated.players) && Array.isArray(updated.matches)) {
    tournamentState = updated;
    saveStateToDisk(tournamentState);
    res.json({ success: true, state: tournamentState });
  } else {
    res.status(400).json({ error: 'Invalid tournament state payload provided' });
  }
});

app.post('/api/tournament-state/reset', (req, res) => {
  tournamentState = {
    ...defaultState,
    players: [],
    matches: [],
    currentMatchId: null,
    round: 1,
    status: 'setup',
    standingOverrides: {},
  };
  saveStateToDisk(tournamentState);
  res.json({ success: true, state: tournamentState });
});

// --- Stream Signaling & Management Endpoints ---
interface Camera {
  id: string;
  name: string;
  lastSeen: number;
}

interface Signal {
  to: string;
  from: string;
  type: string;
  payload: any;
  timestamp: number;
}

let cameras: Record<string, Camera> = {};
let signalQueue: Signal[] = [];

// Heartbeat & camera registration
app.post('/api/stream/register-camera', (req, res) => {
  const { id, name } = req.body;
  if (!id) return res.status(400).json({ error: 'Missing camera ID' });

  cameras[id] = {
    id,
    name: name || `Camera ${id.substring(0, 4)}`,
    lastSeen: Date.now(),
  };

  // Housekeep stale cameras (> 10s)
  const now = Date.now();
  Object.keys(cameras).forEach(camId => {
    if (now - cameras[camId].lastSeen > 10000) {
      delete cameras[camId];
    }
  });

  res.json({ success: true, cameras: Object.values(cameras) });
});

// List all active cameras
app.get('/api/stream/active-cameras', (req, res) => {
  const now = Date.now();
  Object.keys(cameras).forEach(camId => {
    if (now - cameras[camId].lastSeen > 10000) {
      delete cameras[camId];
    }
  });
  res.json(Object.values(cameras));
});

// Submit a signal (offer, answer, or candidate)
app.post('/api/stream/signal', (req, res) => {
  const { to, from, type, payload } = req.body;
  if (!to || !from || !type || !payload) {
    return res.status(400).json({ error: 'Missing signaling properties' });
  }

  signalQueue.push({
    to,
    from,
    type,
    payload,
    timestamp: Date.now(),
  });

  // Cap memory size
  if (signalQueue.length > 500) {
    signalQueue = signalQueue.slice(-100);
  }

  res.json({ success: true });
});

// Retrieve and flush signals for a client
app.get('/api/stream/signals/:clientId', (req, res) => {
  const { clientId } = req.params;
  const clientSignals = signalQueue.filter(s => s.to === clientId);
  signalQueue = signalQueue.filter(s => s.to !== clientId);
  res.json(clientSignals);
});

// Configure Vite or Static File Serving depending on environment
async function initializeServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite development server middleware mounted.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Production static file serving initialized.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express full-stack server running on host 0.0.0.0, port ${PORT}`);
  });
}

initializeServer();
