import express from "express";
import cors from "cors";

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

let messages = [];
let nextId = 1;
const callbacksForNewMessages = [];

// -------------------------------------
// GET messages (long-polling)
// -------------------------------------

app.get("/messages", (req, res) => {
    // Check if there are new messages since the given timestamp
    const since = Number(req.query.since);
    // Filter messages based on the 'since' timestamp
    const messagesToSend = since
      ? messages.filter(m => m.timestamp > since)
      : messages;
  
    // If there are new messages, send them immediately
    if (messagesToSend.length > 0) {
      return res.json(messagesToSend);
    }
  
    // Otherwise, set a timeout to respond after 30 seconds if no new messages arrive
    const timeout = setTimeout(() => {
      res.json([]);
    }, 30000);
  
    // Store the callback to be called when new messages arrive, the client is waiting, as soon as a new message is posted, it's sent instantly
    callbacksForNewMessages.push((newMessages) => {
      // clear the timeout to avoid sending an empty response
      clearTimeout(timeout);
      // Send the new messages to the client
      res.json(newMessages);
    });
  });
  
// -------------------------------------
// POST message 
// -------------------------------------

app.post("/messages", (req, res) => {
  // Validate request body  
  const { author, text } = req.body;

  // Simple validation
  if (!author || !text) {
    return res.status(400).json({ error: "Author and text required" });
  }
    // Create new message
  const newMessage = {
    id: nextId++,
    author,
    text,
    likes: 0,
    dislikes: 0,
    timestamp: Date.now()
  };

  // Store the new message
  messages.push(newMessage);

  // Notify all waiting clients about the new message
  while (callbacksForNewMessages.length > 0) {
    // Remove the last waiting client 
    const callback = callbacksForNewMessages.pop();
    // Send the new message as an array
    callback([newMessage]);
  }
    // Respond to the sender with the created message
  res.status(201).json(newMessage);
});

// -------------------------------------
// POST like/dislike
// -------------------------------------

// Increment likes or dislikes for a message
app.post("/messages/:id/like", (req, res) => {
    // Find the message by ID
    const message = messages.find(m => m.id === Number(req.params.id));
    // If not found, return 404
    if (!message) return res.status(404).json({ error: "Not found" });
    // Increment likes
    message.likes++;
    // Respond with the new like count
    res.json({ likes: message.likes });
  });
  

  app.post("/messages/:id/dislike", (req, res) => {
    // Find the message by ID
    const message = messages.find(m => m.id === Number(req.params.id));
    // If not found, return 404
    if (!message) return res.status(404).json({ error: "Not found" });
    // Increment dislikes
    message.dislikes++;
    // Respond with the new dislike count
    res.json({ dislikes: message.dislikes });
  });
  
app.listen(port, () =>
  console.log(`Chat server running on port ${port}`)
);
