import http from "http";
import express from "express";
import cors from "cors";
import { server as WebSocketServer } from "websocket";

const app = express();
const port = 3000;

// ===============================
// Middleware
// ===============================
// Enable CORS so that our frontend, can make requests to this backend without 
// being blocked by the browser's same-origin policy. This is essential for our frontend to be able to fetch messages 
// and send new messages/reactions via the HTTP API.

//  Built-in middleware to parse JSON bodies. This allows us to access req.body in our POST endpoints when clients send JSON data
//  (e.g. when creating a new message or sending a reaction).
app.use(cors());
app.use(express.json()); // Reads the body of the request, Parses JSON, adds it to req.body

// ===============================
// HTTP Server
// ===============================
const server = http.createServer(app); // http server 

// ===============================
// WebSocket Server
// ===============================
const wsServer = new WebSocketServer({ // WebSocket server needs raw HTTP server to work
  httpServer: server
});

// ===============================
// Shared State
// ===============================
let messages = []; // In-memory message store (Single Source of Truth). Both HTTP and Websocket APIs will read/write to this array.
let nextId = 1; // Simple incremental ID generator for messages.

const connections = []; // Keep track of connected WebSocket clients so we can push updates to them when messages change. 
const callbacksForNewMessages = []; // For long polling: when a new message arrives, we need to notify all pending HTTP requests waiting for new messages. 
// ===================================================
// CORE LOGIC (Single Source of Truth) 
// ===================================================

function notifyLongPolling(newMessages) { // When a new message is created or updated, we need to notify all pending long polling requests so they can respond with the new data.
  while (callbacksForNewMessages.length > 0) {
    const cb = callbacksForNewMessages.pop();
    cb(newMessages);
  }
}

function notifyWebSockets(type, message) { // When a new message is created or updated, we need to push the update to all connected WebSocket clients so they can update their UI in real-time.
  connections.forEach(conn => {
    conn.sendUTF(JSON.stringify({
      type,
      message
    }));
  });
}

function createMessage(author, text) { // Core logic function to create a new message. This is called by both the HTTP API and the WebSocket API when a new message is created. It also takes care of notifying all clients about the new message.
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

function handleReaction(id, reaction) { // Core logic function to handle a like or dislike reaction. This is called by both the HTTP API and the WebSocket API when a reaction is received. It updates the message and notifies all clients about the update.
  const message = messages.find(m => m.id === id);
  if (!message) return null;

  if (reaction === "like") message.likes++;
  if (reaction === "dislike") message.dislikes++;

  // Update timestamp so long polling detects change
  message.timestamp = Date.now();

  notifyLongPolling([message]);
  notifyWebSockets("update", message);

  return message;
}

// ===================================================
// LONG POLLING HTTP API
// ===================================================

app.get("/messages", (req, res) => {
  const since = Number(req.query.since); // Get "since" timestamp from query params

  const messagesToSend = since // If "since" is provided, filter messages to only those newer than "since". Otherwise, send all messages.
    ? messages.filter(m => m.timestamp > since)
    : messages;

  if (messagesToSend.length > 0) { // If the messages exist, send immediately, if not hold the request open 
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

app.post("/messages", (req, res) => { // Create new message via HTTP API
  const { author, text } = req.body;

  if (!author || !text) {
    return res.status(400).json({ error: "Author and text required" });
  }

  const newMessage = createMessage(author, text); // Use core logic function to create message, which will also handle notifying WebSocket and long polling clients.
  res.status(201).json(newMessage);
});

app.post("/messages/:id/like", (req, res) => { // Like a message via HTTP API
  const message = handleReaction(Number(req.params.id), "like");
  if (!message) return res.status(404).json({ error: "Not found" });

  res.json({ likes: message.likes }); // Only return the updated like count, not the whole message. The frontend will update the UI based on this response.
});

app.post("/messages/:id/dislike", (req, res) => { // Dislike a message via HTTP API
  const message = handleReaction(Number(req.params.id), "dislike");
  if (!message) return res.status(404).json({ error: "Not found" });

  res.json({ dislikes: message.dislikes }); // Only return the updated dislike count, not the whole message. The frontend will update the UI based on this response.
});

// ===================================================
// WEBSOCKET
// ===================================================

wsServer.on("request", (request) => { // When a new WebSocket connection is requested, accept it and add it to our list of connections.
  const connection = request.accept(null, request.origin); // accept the connection
  connections.push(connection); // store the connection so we can send updates to it later

  console.log("🔌 WebSocket connected");

  // Send initial state
  connection.sendUTF(JSON.stringify({
    type: "init",
    messages
  }));

  // When a message is received from the client, parse it and determine if it's a new chat message or a reaction (like/dislike). 
  // Then call the appropriate core logic function to handle it, which will also take care of notifying other clients.
  connection.on("message", (message) => { 
    if (message.type !== "utf8") return; // We only support UTF-8 text messages, ignore anything else (e.g. binary data).

    let data;
    try {
      data = JSON.parse(message.utf8Data); // Parse the incoming message data. We expect it to be JSON with a "type" field that indicates what kind of message it is (e.g. "message", "like", "dislike").
    } catch {
      return;
    }

    if (data.type === "message") { // If it's a new chat message
      createMessage(data.author, data.text);
    }

    if (data.type === "like") { // If it's a like reaction
      handleReaction(data.id, "like");
    }

    if (data.type === "dislike") { // If it's a dislike reaction
      handleReaction(data.id, "dislike");
    }
  });

  // When the WebSocket connection is closed, remove it from our list of connections so we don't try to send updates to it anymore.
  connection.on("close", () => { 
    const index = connections.indexOf(connection);
    if (index !== -1) connections.splice(index, 1);
    console.log("❌ WebSocket disconnected");
  });
});

// ===============================
// TEST EXPORTS
// ===============================

export function resetMessages() {
  messages = [];
  nextId = 1;
}

export { createMessage, handleReaction, messages };


// ===============================
// Start Server
// ===============================

if (process.env.NODE_ENV !== "test") {
  server.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
  });
}



