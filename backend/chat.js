import express from "express";
import cors from "cors";

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

let messages = [];
let nextId = 1;
const callbacksForNewMessages = [];

// GET messages (long-polling)
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
  
    // Store the callback to be called when new messages arrive, the client is waiting, as soon as a new message is posted, it;s sent instantly
    callbacksForNewMessages.push((newMessages) => {
      clearTimeout(timeout);
      res.json(newMessages);
    });
  });
  

// POST message
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

  // Notify all waiting clients
  while (callbacksForNewMessages.length > 0) {
    const callback = callbacksForNewMessages.pop();
    callback([newMessage]);
  }

  res.status(201).json(newMessage);
});

// POST like/dislike
app.post("/messages/:id/like", (req, res) => {
    const message = messages.find(m => m.id === Number(req.params.id));
    if (!message) return res.status(404).json({ error: "Not found" });
    message.likes++;
    res.json({ likes: message.likes });
  });
  
  app.post("/messages/:id/dislike", (req, res) => {
    const message = messages.find(m => m.id === Number(req.params.id));
    if (!message) return res.status(404).json({ error: "Not found" });
    message.dislikes++;
    res.json({ dislikes: message.dislikes });
  });
  

app.listen(port, () =>
  console.log(`Chat server running on port ${port}`)
);
