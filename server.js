import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import https from "https";
import http from "http";
import os from "os";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const CERT_KEY = "./certs/localhost-key.pem";
const CERT_CRT = "./certs/localhost.pem";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY in .env — see .env.example");
  process.exit(1);
}

app.use(cors());
app.use(express.static("public"));
app.use(express.json());

const LEVA_INSTRUCTIONS = `
You are Leva, an intelligent voice assistant.

Personality: professional, friendly, intelligent, concise, proactive. You can
explain complex topics simply and you occasionally show light wit, but you
never ramble. Address the user respectfully. When asked your name, say you
are Leva.

Rules:
- Keep spoken responses concise unless the user asks for more detail.
- Be truthful; admit uncertainty rather than guessing.
- Ask a clarifying question when a request is ambiguous.
- Never reveal API keys, credentials, or secret configuration.

You can open apps on the user's Android phone using the open_app function.
When the user asks you to open, launch, or start an app (e.g. "open Spotify",
"pull up Maps", "message Sarah on WhatsApp"), call open_app with the closest
matching app_name from the allowed list. Confirm briefly once it's done
(e.g. "Opening Spotify.").
`.trim();

const SUPPORTED_APPS = [
  "spotify", "youtube_music", "youtube",
  "google_maps",
  "whatsapp", "messages", "telegram", "gmail",
  "instagram", "facebook", "twitter", "snapchat", "tiktok",
  "phone", "camera", "boomplay", "dream_league_soccer",
];

const TOOLS = [
  {
    type: "function",
    name: "open_app",
    description:
      "Open an application on the user's Android phone via a deep link.",
    parameters: {
      type: "object",
      properties: {
        app_name: {
          type: "string",
          enum: SUPPORTED_APPS,
          description: "Which app to open.",
        },
      },
      required: ["app_name"],
    },
  },
];

app.post("/session", async (req, res) => {
  try {
    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview",
        voice: "alloy",
        instructions: LEVA_INSTRUCTIONS,
        modalities: ["audio", "text"],
        input_audio_transcription: { model: "whisper-1" },
        tools: TOOLS,
        tool_choice: "auto",
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenAI session error:", errText);
      return res.status(response.status).json({ error: "Failed to create session" });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

function getLanIps() {
  const nets = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal) ips.push(net.address);
    }
  }
  return ips;
}

const hasCerts = fs.existsSync(CERT_KEY) && fs.existsSync(CERT_CRT);
const lanIps = getLanIps();

if (hasCerts) {
  const server = https.createServer(
    {
      key: fs.readFileSync(CERT_KEY),
      cert: fs.readFileSync(CERT_CRT),
    },
    app
  );
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Leva backend running (HTTPS) on port ${PORT}`);
  });
} else {
  http.createServer(app).listen(PORT, "0.0.0.0", () => {
    console.log(`Leva backend running (HTTP) on port ${PORT}`);
  });
}
