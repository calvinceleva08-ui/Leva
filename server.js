<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Leva</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
  :root {
    --accent: #00d4ff;
    --bg: #05070a;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: radial-gradient(circle at center, #0a1420 0%, var(--bg) 70%);
    font-family: "Segoe UI", system-ui, sans-serif;
    color: #eaf6ff;
  }
  h1 {
    letter-spacing: 4px;
    font-weight: 300;
    color: var(--accent);
    text-shadow: 0 0 20px rgba(0, 212, 255, 0.6);
    margin-bottom: 0.2em;
  }
  #status {
    color: #8fb8c9;
    margin-bottom: 2em;
    font-size: 0.9em;
    min-height: 1.2em;
  }
  #orb {
    width: 140px;
    height: 140px;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 35%, #4be1ff, #006a8f 70%);
    box-shadow: 0 0 40px rgba(0, 212, 255, 0.5), inset 0 0 30px rgba(255,255,255,0.2);
    transition: transform 0.15s ease, box-shadow 0.15s ease;
    cursor: pointer;
  }
  #orb.listening {
    animation: pulse 1.4s infinite ease-in-out;
  }
  @keyframes pulse {
    0%, 100% { transform: scale(1); box-shadow: 0 0 40px rgba(0,212,255,0.5); }
    50% { transform: scale(1.08); box-shadow: 0 0 70px rgba(0,212,255,0.9); }
  }
  #transcript {
    margin-top: 2.5em;
    max-width: 600px;
    width: 90%;
    max-height: 30vh;
    overflow-y: auto;
    font-size: 0.95em;
    line-height: 1.5em;
    color: #cfe9f5;
  }
  #transcript .user { color: #6be2ff; }
  #transcript .leva { color: #eaf6ff; }
  #controls {
    margin-top: 1.5em;
  }
  button {
    background: transparent;
    border: 1px solid var(--accent);
    color: var(--accent);
    padding: 0.6em 1.4em;
    border-radius: 20px;
    cursor: pointer;
    font-size: 0.9em;
    letter-spacing: 1px;
  }
  button:hover { background: rgba(0,212,255,0.1); }
  button:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
</head>
<body>
  <h1>L E V A</h1>
  <div id="status">Click the orb to connect</div>
  <div id="orb"></div>
  <div id="controls">
    <button id="disconnectBtn" disabled>Disconnect</button>
  </div>
  <div id="transcript"></div>

  <audio id="levaAudio" autoplay></audio>

  <script>
    const orb = document.getElementById("orb");
    const statusEl = document.getElementById("status");
    const disconnectBtn = document.getElementById("disconnectBtn");
    const audioEl = document.getElementById("levaAudio");
    const transcriptEl = document.getElementById("transcript");

    let pc = null;
    let dc = null;
    let micStream = null;

    const APP_INTENTS = {
      spotify: "intent://open#Intent;package=com.spotify.music;scheme=spotify;S.browser_fallback_url=https://play.google.com/store/apps/details?id=com.spotify.music;end",
      youtube_music: "intent://music.youtube.com#Intent;package=com.google.android.apps.youtube.music;scheme=https;S.browser_fallback_url=https://play.google.com/store/apps/details?id=com.google.android.apps.youtube.music;end",
      youtube: "intent://www.youtube.com#Intent;package=com.google.android.youtube;scheme=https;S.browser_fallback_url=https://play.google.com/store/apps/details?id=com.google.android.youtube;end",
      google_maps: "intent://maps.google.com#Intent;package=com.google.android.apps.maps;scheme=https;S.browser_fallback_url=https://play.google.com/store/apps/details?id=com.google.android.apps.maps;end",
      whatsapp: "intent://send#Intent;package=com.whatsapp;scheme=whatsapp;S.browser_fallback_url=https://play.google.com/store/apps/details?id=com.whatsapp;end",
      messages: "intent://#Intent;package=com.google.android.apps.messaging;end",
      telegram: "intent://resolve#Intent;package=org.telegram.messenger;scheme=tg;S.browser_fallback_url=https://play.google.com/store/apps/details?id=org.telegram.messenger;end",
      gmail: "intent://#Intent;package=com.google.android.gm;end",
      instagram: "intent://instagram.com#Intent;package=com.instagram.android;scheme=https;S.browser_fallback_url=https://play.google.com/store/apps/details?id=com.instagram.android;end",
      facebook: "intent://facebook.com#Intent;package=com.facebook.katana;scheme=https;S.browser_fallback_url=https://play.google.com/store/apps/details?id=com.facebook.katana;end",
      twitter: "intent://twitter.com#Intent;package=com.twitter.android;scheme=https;S.browser_fallback_url=https://play.google.com/store/apps/details?id=com.twitter.android;end",
      snapchat: "intent://camera#Intent;package=com.snapchat.android;scheme=snapchat;S.browser_fallback_url=https://play.google.com/store/apps/details?id=com.snapchat.android;end",
      tiktok: "intent://#Intent;package=com.zhiliaoapp.musically;end",
      phone: "intent://#Intent;action=android.intent.action.DIAL;end",
      camera: "intent://#Intent;action=android.media.action.IMAGE_CAPTURE;end",
      boomplay: "intent://#Intent;package=com.afmobi.boomplayer;S.browser_fallback_url=https://play.google.com/store/apps/details?id=com.afmobi.boomplayer;end",
      dream_league_soccer: "intent://#Intent;package=com.firsttouchgames.dls7;S.browser_fallback_url=https://play.google.com/store/apps/details?id=com.firsttouchgames.dls7;end",
    };

    function openApp(appName) {
      const intentUrl = APP_INTENTS[appName];
      if (!intentUrl) {
        return { success: false, error: `No deep link configured for "${appName}"` };
      }
      window.location.href = intentUrl;
      return { success: true, app: appName };
    }

    function setStatus(text) {
      statusEl.textContent = text;
    }

    function addTranscriptLine(who, text) {
      const line = document.createElement("div");
      line.className = who;
      line.textContent = (who === "user" ? "You: " : "Leva: ") + text;
      transcriptEl.appendChild(line);
      transcriptEl.scrollTop = transcriptEl.scrollHeight;
    }

    async function connect() {
      try {
        setStatus("Requesting session...");

        const sessionResp = await fetch("/session", { method: "POST" });
        if (!sessionResp.ok) throw new Error("Failed to get session token");
        const sessionData = await sessionResp.json();
        const ephemeralKey = sessionData.value;

        pc = new RTCPeerConnection();

        pc.ontrack = (event) => {
          audioEl.srcObject = event.streams[0];
        };

        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStream.getTracks().forEach((track) => pc.addTrack(track, micStream));

        dc = pc.createDataChannel("oai-events");
        dc.addEventListener("message", (e) => {
          const event = JSON.parse(e.data);
          handleServerEvent(event);
        });

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const sdpResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
          method: "POST",
          body: offer.sdp,
          headers: {
            Authorization: `Bearer ${ephemeralKey}`,
            "Content-Type": "application/sdp",
          },
        });

        const answerSdp = await sdpResponse.text();
        await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

        setStatus("Connected — listening");
        orb.classList.add("listening");
        disconnectBtn.disabled = false;
      } catch (err) {
        console.error(err);
        setStatus("Connection failed: " + err.message);
      }
    }

    function handleServerEvent(event) {
      if (event.type === "response.audio_transcript.done") {
        addTranscriptLine("leva", event.transcript);
      }
      if (event.type === "conversation.item.input_audio_transcription.completed") {
        addTranscriptLine("user", event.transcript);
      }
      if (event.type === "response.output_item.done" && event.item?.type === "function_call") {
        handleFunctionCall(event.item);
      }
    }

    function handleFunctionCall(item) {
      const { name, call_id, arguments: argsJson } = item;
      let result;

      if (name === "open_app") {
        try {
          const args = JSON.parse(argsJson);
          result = openApp(args.app_name);
          addTranscriptLine("leva", `[opening ${args.app_name}]`);
        } catch (err) {
          result = { success: false, error: err.message };
        }
      } else {
        result = { success: false, error: `Unknown function: ${name}` };
      }

      dc.send(JSON.stringify({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id,
          output: JSON.stringify(result),
        },
      }));

      dc.send(JSON.stringify({ type: "response.create" }));
    }

    function disconnect() {
      if (dc) dc.close();
      if (pc) pc.close();
      if (micStream) micStream.getTracks().forEach((t) => t.stop());
      pc = null;
      dc = null;
      micStream = null;
      orb.classList.remove("listening");
      disconnectBtn.disabled = true;
      setStatus("Disconnected. Click the orb to reconnect.");
    }

    orb.addEventListener("click", () => {
      if (!pc) connect();
    });
    disconnectBtn.addEventListener("click", disconnect);
  </script>
</body>
</html>
