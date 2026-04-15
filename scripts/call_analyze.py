#!/usr/bin/env python3
"""Call the SalesLens analyze.run tRPC endpoint to run the full AI pipeline."""
import json
import urllib.request
import urllib.error
import os
import pymysql
from urllib.parse import urlparse

# Load transcript from DB
db_url = os.environ.get('DATABASE_URL', '')
parsed = urlparse(db_url)
conn = pymysql.connect(
    host=parsed.hostname,
    port=parsed.port or 3306,
    user=parsed.username,
    password=parsed.password,
    database=parsed.path.lstrip('/').split('?')[0],
    ssl={'ssl': True},
    charset='utf8mb4',
)
with conn.cursor() as cur:
    cur.execute('SELECT `fullText` FROM transcripts WHERE meetingId = 30001 ORDER BY id DESC LIMIT 1')
    row = cur.fetchone()
    transcript = row[0] if row else None
conn.close()

if not transcript:
    print("ERROR: No transcript found for meeting 30001")
    exit(1)

print(f"Transcript loaded: {len(transcript)} chars")

# Build tRPC request payload
payload = {
    "json": {
        "meetingId": 30001,
        "transcript": transcript,
        "accountName": "Simular AI",
        "contactName": "Dora Qian",
    }
}

body = json.dumps(payload).encode('utf-8')

req = urllib.request.Request(
    "http://localhost:3000/api/trpc/analyze.full",
    data=body,
    headers={
        "Content-Type": "application/json",
        "Content-Length": str(len(body)),
    },
    method="POST"
)

print("Calling analyze.run endpoint... (this may take 30-90 seconds)")
try:
    with urllib.request.urlopen(req, timeout=180) as resp:
        response_text = resp.read().decode('utf-8')
        print(f"Status: {resp.status}")
        data = json.loads(response_text)
        if 'result' in data:
            result = data['result'].get('data', data['result'])
            print("\n=== ANALYSIS RESULT ===")
            print(json.dumps(result, indent=2))
        elif 'error' in data:
            print("ERROR:", json.dumps(data['error'], indent=2))
        else:
            print("RAW:", response_text[:2000])
except urllib.error.HTTPError as e:
    print(f"HTTP Error {e.code}: {e.reason}")
    body = e.read().decode('utf-8')
    print("Body:", body[:2000])
except Exception as e:
    print(f"Error: {type(e).__name__}: {e}")
