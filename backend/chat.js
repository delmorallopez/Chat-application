import express from "express";
import cors from "cors";

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

let messages = [];
let nextId = 1;

// GET messages
app.get("/messages", (req, res) => {
  res.json(messages);
});

// POST new message
app.post("/messages", (req, res) => {
  const { author, text } = req.body;

  if (!author || !text) {
    return res.status(400).json({ error: "Author and text are required" });
  }

  const message = {
    id: nextId++,
    author,
    text,
    likes: 0,
    dislikes: 0
  };

  messages.push(message);
  res.status(201).json(message);
});

// LIKE message
app.post("/messages/:id/like", (req, res) => {
  const id = Number(req.params.id);
  const message = messages.find(m => m.id === id);

  if (!message) {
    return res.status(404).json({ error: "Message not found" });
  }

  message.likes++;
  res.json({ likes: message.likes });
});

// DISLIKE message
app.post("/messages/:id/dislike", (req, res) => {
  const id = Number(req.params.id);
  const message = messages.find(m => m.id === id);

  if (!message) {
    return res.status(404).json({ error: "Message not found" });
  }

  message.dislikes++;
  res.json({ dislikes: message.dislikes });
});

app.listen(port, () => {
  console.log(`Chat server running on port ${port}`);
});
