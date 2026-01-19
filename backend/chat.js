import express from "express";
import cors from "cors";

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

let messages = []; // In-memory storage for now

// GET messages
app.get("/messages", (req, res) => {
  res.json(messages);
});

// POST message
app.post("/messages", (req, res) => {
  const { author, text } = req.body;
  if (!author || !text) {
    return res.status(400).json({ error: "Author and text are required" });
  }

  messages.push({ author, text });
  res.status(201).json({ success: true });
});

app.listen(port, () => console.log(`Chat server running on port ${port}`));
