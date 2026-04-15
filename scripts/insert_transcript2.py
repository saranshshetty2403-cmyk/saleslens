#!/usr/bin/env python3
import os, pymysql
from urllib.parse import urlparse

transcript = open('/home/ubuntu/upload/pasted_content.txt').read()
word_count = len(transcript.split())
print(f"Transcript: {len(transcript)} chars, {word_count} words")

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
    autocommit=False,
)

try:
    with conn.cursor() as cur:
        # Use backtick-quoted column names to avoid reserved word issues
        sql = "INSERT INTO transcripts (meetingId, `fullText`, wordCount) VALUES (%s, %s, %s)"
        cur.execute(sql, (30001, transcript, word_count))
        print(f"Inserted rows: {cur.rowcount}, lastrowid: {cur.lastrowid}")
    conn.commit()
    print("Committed")
except Exception as e:
    conn.rollback()
    print(f"Error: {type(e).__name__}: {str(e)[:200]}")
finally:
    conn.close()
