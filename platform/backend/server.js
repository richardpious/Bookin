const express = require('express');
const cors = require('cors');

let OpenClaw;
async function initOpenClaw() {
  try {
    const mod = await import('openclaw-sdk');
    OpenClaw = mod.OpenClawClient || mod.OpenClaw || mod.default || mod;
  } catch(err) {
    console.warn("OpenClaw SDK not found or failed to load. We will use a mock for demonstration.", err.message);
  }
}

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3001;

let ocClient;
initOpenClaw().then(async () => {
  if (typeof OpenClaw === 'function') {
    try {
      ocClient = new OpenClaw({ 
        url: 'ws://127.0.0.1:18789',
        clientId: 'gateway-client',
        clientVersion: '1.0.0',
        platform: 'typescript-sdk',
        mode: 'node'
      });
      await ocClient.connect();
      console.log("Connected to OpenClaw Gateway.");
    } catch (err) {
      console.warn("Failed to initialize OpenClaw agent client.", err.message);
    }
  } else {
    console.warn("OpenClaw constructor not found. Falling back to mock agent.");
  }
});

let session;

app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    let reply;
    if (ocClient) {
      try {
        if (!session) {
          session = await ocClient.sessions.create({ agentId: "main", label: "chat-ui-session" });
        }
        
        const run = await session.send(message);
        
        let assistantReply = "";
        for await (const event of run.events()) {
          const data = event.data;
          if (event.type === "assistant.delta" && typeof data?.delta === "string") {
            assistantReply += data.delta;
          }
        }
        
        await run.wait();
        reply = assistantReply || "[Agent did not return a message]";
      } catch (err) {
        reply = `[Error] Failed to send message to agent: ${err.message}`;
      }
    } else {
      reply = `[Mock Agent] I received your message: "${message}". The OpenClaw SDK is not initialized yet.`;
    }

    res.json({ reply });
  } catch (error) {
    console.error('Error handling chat request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
