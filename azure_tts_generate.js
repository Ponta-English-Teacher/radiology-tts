import fs from "fs";
import fetch from "node-fetch";
import { config } from "dotenv";
config();

const subscriptionKey = process.env.AZURE_API_KEY;
const region = process.env.AZURE_REGION;
const voiceName = "en-US-JennyNeural"; // お好みで変更可
const inputFilePath = "positions_utf16.json";
const outputFolder = "sounds";

if (!fs.existsSync(outputFolder)) fs.mkdirSync(outputFolder);

async function synthesizeSpeech(id, text) {
  const url = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;

  const ssml = `
    <speak version='1.0' xml:lang='en-US'>
      <voice xml:lang='en-US' xml:gender='Female' name='${voiceName}'>
        ${text}
      </voice>
    </speak>`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": subscriptionKey,
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": "audio-16khz-32kbitrate-mono-mp3",
      "User-Agent": "radiology-tts"
    },
    body: ssml
  });

  if (!response.ok) {
    throw new Error(`❌ ${id}: Azure TTS failed - ${await response.text()}`);
  }

  const buffer = await response.buffer();
  fs.writeFileSync(`${outputFolder}/${id}.mp3`, buffer);
  console.log(`✅ Saved: ${id}.mp3`);
}

async function processAll() {
  const raw = fs.readFileSync(inputFilePath, "utf-8");
  const data = JSON.parse(raw);

  for (const item of data) {
    const { id, instructionSteps } = item;
    const outputPath = `${outputFolder}/${id}.mp3`;

    if (fs.existsSync(outputPath)) {
      console.log(`⏭️ Skipped (already exists): ${id}.mp3`);
      continue;
    }

    const combinedText = instructionSteps.map(s => s.en).join(" ");
    try {
      await synthesizeSpeech(id, combinedText);
    } catch (err) {
      console.error(err.message);
    }
  }
}

processAll();
