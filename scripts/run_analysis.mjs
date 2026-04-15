/**
 * Directly invoke the SalesLens AI analysis pipeline on meeting 30001
 * (Simular AI X HackerEarth transcript)
 */
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import fetch from "node-fetch";

// We'll call the live server directly
const BASE_URL = "http://localhost:3000";

async function main() {
  // First get the transcript from the DB
  const mysql2 = await import("mysql2/promise");
  const url = process.env.DATABASE_URL;
  const conn = await mysql2.default.createConnection(url);
  
  const [transcriptRows] = await conn.execute(
    "SELECT `fullText`, wordCount FROM transcripts WHERE meetingId = 30001 ORDER BY id DESC LIMIT 1"
  );
  const transcript = transcriptRows[0]?.fullText;
  if (!transcript) {
    console.error("No transcript found for meeting 30001");
    await conn.end();
    return;
  }
  console.log(`Transcript loaded: ${transcript.length} chars`);
  
  await conn.end();
  
  // Call the analyze.run procedure via HTTP
  const response = await fetch(`${BASE_URL}/api/trpc/analyze.run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      json: {
        meetingId: 30001,
        transcript: transcript,
        accountName: "Simular AI",
        contactName: "Dora Qian",
      }
    })
  });
  
  const text = await response.text();
  console.log("Response status:", response.status);
  
  try {
    const data = JSON.parse(text);
    if (data.result) {
      console.log("\n=== ANALYSIS COMPLETE ===");
      console.log(JSON.stringify(data.result.data, null, 2));
    } else if (data.error) {
      console.error("Error:", JSON.stringify(data.error, null, 2));
    } else {
      console.log("Raw response:", text.substring(0, 500));
    }
  } catch(e) {
    console.log("Raw response:", text.substring(0, 1000));
  }
}

main().catch(console.error);
