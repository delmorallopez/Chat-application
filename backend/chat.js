import http from "http";
import express from "express";
import cors from "cors";
import { server as WebSocketServer } from "websocket";

const app = express();
const port = 3000;

// --------------------
// Middleware
// --------------------
app.use(cors());
app.use(express.json());

// --------------------
// HTTP server (shared)
// --------------------
const server = http.createServer(app);

// --------------------
// WebSocket server
// --------------------
const wsServer = new WebSocketServer({
  httpServer: server
});

// --------------------
// Shared state
// --------------------
let messages = [];
let nextId = 1;

// Long-polling callbacks
const callbacksForNewMessages = [];

// WebSocket connections
const connections = [];

// ===================================================
// LONG-POLLING HTTP API
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

  const newMessage = {
    id: nextId++,
    author,
    text,
    likes: 0,
    dislikes: 0,
    timestamp: Date.now()
  };

  messages.push(newMessage);

  // Notify long-polling clients
  while (callbacksForNewMessages.length > 0) {
    const cb = callbacksForNewMessages.pop();
    cb([newMessage]);
  }

  // Notify WebSocket clients
  connections.forEach(conn => {
    conn.sendUTF(JSON.stringify({
      type: "message",
      message: newMessage
    }));
  });

  res.status(201).json(newMessage);
});

app.post("/messages/:id/like", (req, res) => {
  const msg = messages.find(m => m.id === Number(req.params.id));
  if (!msg) return res.status(404).json({ error: "Not found" });

  msg.likes++;

  broadcastUpdate(msg);
  res.json({ likes: msg.likes });
});

app.post("/messages/:id/dislike", (req, res) => {
  const msg = messages.find(m => m.id === Number(req.params.id));
  if (!msg) return res.status(404).json({ error: "Not found" });

  msg.dislikes++;

  broadcastUpdate(msg);
  res.json({ dislikes: msg.dislikes });
});

// ===================================================
// WEBSOCKET
// ===================================================

// ===================================================
// WEBSOCKET
// ===================================================

wsServer.on("request", (request) => {
    const connection = request.accept(null, request.origin);
    connections.push(connection);
  
    console.log("🔌 WebSocket connected");
  
    // Send initial messages
    connection.sendUTF(JSON.stringify({
      type: "init",
      messages
    }));
  
    // --------------------
    // Handle incoming WS messages
    // --------------------
    connection.on("message", (message) => {
      if (message.type !== "utf8") return;
  
      let data;
      try {
        data = JSON.parse(message.utf8Data);
      } catch {
        return;
      }
  
      // NEW MESSAGE
      if (data.type === "message") {
        const newMessage = {
          id: nextId++,
          author: data.author,
          text: data.text,
          likes: 0,
          dislikes: 0,
          timestamp: Date.now()
        };
  
        messages.push(newMessage);
  
        connections.forEach(conn =>
          conn.sendUTF(JSON.stringify({
            type: "message",
            message: newMessage
          }))
        );
  
        return;
      }
  
      // LIKE
      if (data.type === "like") {
        handleReaction(data.id, "like");
        return;
      }
  
      // DISLIKE
      if (data.type === "dislike") {
        handleReaction(data.id, "dislike");
        return;
      }
    });
  
    // --------------------
    // Handle disconnect
    // --------------------
    connection.on("close", () => {
      const index = connections.indexOf(connection);
      if (index !== -1) connections.splice(index, 1);
      console.log("❌ WebSocket disconnected");
    });
  });
  
  
  // --------------------
    // Handle Reactions
    // --------------------
    
  function handleReaction(id, reaction) {
    const message = messages.find(m => m.id === id);
    if (!message) return;
  
    if (reaction === "like") message.likes++;
    if (reaction === "dislike") message.dislikes++;
  
    connections.forEach(conn =>
      conn.sendUTF(JSON.stringify({
        type: "update",
        message
      }))
    );
  }

  

// --------------------
// Helper
// --------------------
function broadcastUpdate(message) {
  connections.forEach(conn =>
    conn.sendUTF(JSON.stringify({
      type: "update",
      message
    }))
  );
}

// --------------------
// Start server
// --------------------
server.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
