#!/usr/bin/env python3
"""Update the Simular AI transcript with the real user-provided content."""
import os
import pymysql
from urllib.parse import urlparse

# Read transcript
with open('/home/ubuntu/upload/pasted_content.txt', 'r') as f:
    transcript = f.read()

word_count = len(transcript.split())
print(f"Transcript length: {len(transcript)} chars, {word_count} words")

# Parse DATABASE_URL
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

try:
    with conn.cursor() as cur:
        # Use backtick-quoted column name to avoid reserved word issues
        cur.execute(
            "UPDATE transcripts SET `fullText` = %s, wordCount = %s WHERE meetingId = %s",
            (transcript, word_count, 30001)
        )
        print(f"Rows affected: {cur.rowcount}")
    conn.commit()
    print("Transcript updated successfully")
finally:
    conn.close()
