var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_fs = __toESM(require("fs"), 1);
var app = (0, import_express.default)();
var PORT = 3e3;
var STATE_FILE = import_path.default.join(process.cwd(), "tournament_state.json");
app.use(import_express.default.json({ limit: "10mb" }));
var defaultState = {
  players: [],
  matches: [],
  currentMatchId: null,
  round: 1,
  status: "setup",
  config: {
    pointsToWin: 21,
    winByTwo: true,
    servesPerChange: 5,
    enableFourPointRule: true,
    enableGraceRule: true
  },
  standingOverrides: {}
};
var tournamentState = { ...defaultState };
try {
  if (import_fs.default.existsSync(STATE_FILE)) {
    const data = import_fs.default.readFileSync(STATE_FILE, "utf-8");
    const parsed = JSON.parse(data);
    if (parsed && Array.isArray(parsed.players) && Array.isArray(parsed.matches)) {
      tournamentState = parsed;
      console.log("Successfully loaded persisted tournament state from disk.");
    }
  }
} catch (err) {
  console.error("Error loading tournament state from file, fallback to default:", err);
}
function saveStateToDisk(state) {
  try {
    import_fs.default.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing tournament state to disk:", err);
  }
}
app.get("/api/tournament-state", (req, res) => {
  res.json(tournamentState);
});
app.post("/api/tournament-state", (req, res) => {
  const updated = req.body;
  if (updated && Array.isArray(updated.players) && Array.isArray(updated.matches)) {
    tournamentState = updated;
    saveStateToDisk(tournamentState);
    res.json({ success: true, state: tournamentState });
  } else {
    res.status(400).json({ error: "Invalid tournament state payload provided" });
  }
});
app.post("/api/tournament-state/reset", (req, res) => {
  tournamentState = {
    ...defaultState,
    players: [],
    matches: [],
    currentMatchId: null,
    round: 1,
    status: "setup",
    standingOverrides: {}
  };
  saveStateToDisk(tournamentState);
  res.json({ success: true, state: tournamentState });
});
var cameras = {};
var signalQueue = [];
app.post("/api/stream/register-camera", (req, res) => {
  const { id, name } = req.body;
  if (!id) return res.status(400).json({ error: "Missing camera ID" });
  cameras[id] = {
    id,
    name: name || `Camera ${id.substring(0, 4)}`,
    lastSeen: Date.now()
  };
  const now = Date.now();
  Object.keys(cameras).forEach((camId) => {
    if (now - cameras[camId].lastSeen > 1e4) {
      delete cameras[camId];
    }
  });
  res.json({ success: true, cameras: Object.values(cameras) });
});
app.get("/api/stream/active-cameras", (req, res) => {
  const now = Date.now();
  Object.keys(cameras).forEach((camId) => {
    if (now - cameras[camId].lastSeen > 1e4) {
      delete cameras[camId];
    }
  });
  res.json(Object.values(cameras));
});
app.post("/api/stream/signal", (req, res) => {
  const { to, from, type, payload } = req.body;
  if (!to || !from || !type || !payload) {
    return res.status(400).json({ error: "Missing signaling properties" });
  }
  signalQueue.push({
    to,
    from,
    type,
    payload,
    timestamp: Date.now()
  });
  if (signalQueue.length > 500) {
    signalQueue = signalQueue.slice(-100);
  }
  res.json({ success: true });
});
app.get("/api/stream/signals/:clientId", (req, res) => {
  const { clientId } = req.params;
  const clientSignals = signalQueue.filter((s) => s.to === clientId);
  signalQueue = signalQueue.filter((s) => s.to !== clientId);
  res.json(clientSignals);
});
async function initializeServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
    console.log("Vite development server middleware mounted.");
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
    console.log("Production static file serving initialized.");
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express full-stack server running on host 0.0.0.0, port ${PORT}`);
  });
}
initializeServer();
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
//# sourceMappingURL=server.cjs.map
