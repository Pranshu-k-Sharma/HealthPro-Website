import React, { useState } from "react";
import "./Chatbot.css";

function Chatbot() {
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");

  const handleSend = () => {
    if (message.toLowerCase().includes("fever")) {
      setReply("Drink fluids, rest well, and consult a doctor if fever persists.");
    } else if (message.toLowerCase().includes("diet")) {
      setReply("A balanced diet with fruits, vegetables, and proteins is recommended.");
    } else {
      setReply("Please consult a medical professional for accurate advice.");
    }
  };

  return (
    <div className="chatbot">
      <h5>💬 Health Assistant</h5>
      <input
        type="text"
        placeholder="Ask about health..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <button onClick={handleSend}>Ask</button>
      <p>{reply}</p>
    </div>
  );
}

export default Chatbot;
