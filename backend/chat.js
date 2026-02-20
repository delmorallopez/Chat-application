import http from "http";
import express from "express";
import cors from "cors";
import { server as WebSocketServer } from "websocket";

const app = express();
const port = 3000;

// ===============================
// Middleware
// ===============================
app.use(cors());
app.use(express.json());

// ===============================
// HTTP Server
// ===============================
const server = http.createServer(app);

// ===============================
// WebSocket Server
// ===============================
const wsServer = new WebSocketServer({
  httpServer: server
});

// ===============================
// Shared State
// ===============================
let messages = [];
let nextId = 1;

const connections = [];
const callbacksForNewMessages = [];

// ===================================================
// CORE LOGIC (Single Source of Truth)
// ===================================================

function notifyLongPolling(newMessages) {
  while (callbacksForNewMessages.length > 0) {
    const cb = callbacksForNewMessages.pop();
    cb(newMessages);
  }
}

function notifyWebSockets(type, message) {
  connections.forEach(conn => {
    conn.sendUTF(JSON.stringify({
      type,
      message
    }));
  });
}

function createMessage(author, text) {
  const newMessage = {
    id: nextId++,
    author,
    text,
    likes: 0,
    dislikes: 0,
    timestamp: Date.now()
  };

  messages.push(newMessage);

  notifyLongPolling([newMessage]);
  notifyWebSockets("message", newMessage);

  return newMessage;
}

function handleReaction(id, reaction) {
  const message = messages.find(m => m.id === id);
  if (!message) return null;

  if (reaction === "like") message.likes++;
  if (reaction === "dislike") message.dislikes++;

  // 🔥 Update timestamp so long polling detects change
  message.timestamp = Date.now();

  notifyLongPolling([message]);
  notifyWebSockets("update", message);

  return message;
}

// ===================================================
// LONG POLLING HTTP API
// ===================================================

app.get("/messages", (req, res) => {
  const since = Number(req.query.since);

  const messagesToSend = since
    ? messages.filter(m => m.timestamp > since)
    : messages;

  if (messagesToSend.length > 0) {
    return res.json(messagesToSend);
  }

  const timeout = setTimeout(() => {
    res.json([]);
  }, 30000);

  callbacksForNewMessages.push((newMessages) => {
    clearTimeout(timeout);
    res.json(newMessages);
  });
});

app.post("/messages", (req, res) => {
  const { author, text } = req.body;

  if (!author || !text) {
    return res.status(400).json({ error: "Author and text required" });
  }

  const newMessage = createMessage(author, text);
  res.status(201).json(newMessage);
});

app.post("/messages/:id/like", (req, res) => {
  const message = handleReaction(Number(req.params.id), "like");
  if (!message) return res.status(404).json({ error: "Not found" });

  res.json({ likes: message.likes });
});

app.post("/messages/:id/dislike", (req, res) => {
  const message = handleReaction(Number(req.params.id), "dislike");
  if (!message) return res.status(404).json({ error: "Not found" });

  res.json({ dislikes: message.dislikes });
});

// ===================================================
// WEBSOCKET
// ===================================================

wsServer.on("request", (request) => {
  const connection = request.accept(null, request.origin);
  connections.push(connection);

  console.log("🔌 WebSocket connected");

  // Send initial state
  connection.sendUTF(JSON.stringify({
    type: "init",
    messages
  }));

  connection.on("message", (message) => {
    if (message.type !== "utf8") return;

    let data;
    try {
      data = JSON.parse(message.utf8Data);
    } catch {
      return;
    }

    if (data.type === "message") {
      createMessage(data.author, data.text);
    }

    if (data.type === "like") {
      handleReaction(data.id, "like");
    }

    if (data.type === "dislike") {
      handleReaction(data.id, "dislike");
    }
  });

  connection.on("close", () => {
    const index = connections.indexOf(connection);
    if (index !== -1) connections.splice(index, 1);
    console.log("❌ WebSocket disconnected");
  });
});

// ===============================
// Start Server
// ===============================
server.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
