import { createMessage, handleReaction, resetMessages, messages } from "./chat.js";

describe("Chat Application Core Logic", () => {

  beforeEach(() => {
    resetMessages();
  });

  test("createMessage should create a new message", () => {
    const msg = createMessage("Jane", "Hello World");

    expect(msg.id).toBe(1);
    expect(msg.author).toBe("Jane");
    expect(msg.text).toBe("Hello World");
    expect(msg.likes).toBe(0);
    expect(msg.dislikes).toBe(0);
    expect(messages.length).toBe(1);
  });

  test("handleReaction should increase likes", () => {
    const msg = createMessage("Jane", "Hello");

    handleReaction(msg.id, "like");

    expect(messages[0].likes).toBe(1);
  });

  test("handleReaction should increase dislikes", () => {
    const msg = createMessage("Jane", "Hello");

    handleReaction(msg.id, "dislike");

    expect(messages[0].dislikes).toBe(1);
  });

  test("handleReaction should return null if message not found", () => {
    const result = handleReaction(999, "like");

    expect(result).toBeNull();
  });

});
