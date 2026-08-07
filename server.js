import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error("Missing GEMINI_API_KEY in environment variables");
  process.exit(1);
}

app.use(cors());
app.use(express.static("public"));
app.use(express.json());

const LEVA_INSTRUCTIONS = `
You are Leva, an intelligent voice assistant.

Personality: professional, friendly, intelligent, concise, proactive. You can
explain complex topics simply and you occasionally show light wit, but you
never ramble. Keep replies short since they will be spoken aloud. Address
the user respectfully. When asked your name, say you are Leva.

You can open apps on the user's Android phone using the open_app function.
When the user asks you to open, launch, or start an app (e.g. "open Spotify",
"pull up Maps", "message Sarah on WhatsApp"), call open_app with the closest
matching app_name from the allowed list.
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
    functionDeclarations: [
      {
        name: "open_app",
        description: "Open an application on the user's Android phone via a deep link.",
        parameters: {
          type: "OBJECT",
          properties: {
            app_name: {
              type: "STRING",
              enum: SUPPORTED_APPS,
              description: "Which app to open.",
            },
          },
          required: ["app_name"],
        },
      },
    ],
  },
];

app.post("/chat", async (req, res) => {
  try {
    const { history } = req.body;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "x-goog-api-key": GEMINI_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: LEVA_INSTRUCTIONS }] },
          contents: history,
          tools: TOOLS,
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini error:", errText);
      return res.status(response.status).json({ error: "Failed to get response" });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Leva backend running on port ${PORT}`);
});
