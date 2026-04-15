#!/usr/bin/env python3
"""Migrate data from TiDB/MySQL export to Neon Postgres.
Schema derived from actual column names in the MySQL export.
"""
import json
import psycopg2
import psycopg2.extras
from datetime import datetime
import calendar

NEON_URL = "POSTGRES_URL_REDACTED"

SCHEMA_SQL = """
DROP TABLE IF EXISTS prospects CASCADE;
DROP TABLE IF EXISTS pre_call_intelligence CASCADE;
DROP TABLE IF EXISTS pitch_coaching CASCADE;
DROP TABLE IF EXISTS meddpicc_reports CASCADE;
DROP TABLE IF EXISTS spiced_reports CASCADE;
DROP TABLE IF EXISTS ai_analyses CASCADE;
DROP TABLE IF EXISTS action_items CASCADE;
DROP TABLE IF EXISTS transcripts CASCADE;
DROP TABLE IF EXISTS meetings CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    "openId" VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255),
    email VARCHAR(255),
    "loginMethod" VARCHAR(100),
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    "createdAt" BIGINT,
    "updatedAt" BIGINT,
    "lastSignedIn" BIGINT
);

CREATE TABLE meetings (
    id SERIAL PRIMARY KEY,
    title VARCHAR(512) NOT NULL,
    platform VARCHAR(100),
    "meetingUrl" VARCHAR(1024),
    "recallBotId" VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    "accountName" VARCHAR(255),
    "contactName" VARCHAR(255),
    "dealStage" VARCHAR(100),
    participants JSONB,
    "scheduledAt" BIGINT,
    "startedAt" BIGINT,
    "endedAt" BIGINT,
    "durationSeconds" INTEGER,
    "recordingUrl" VARCHAR(1024),
    "createdAt" BIGINT,
    "updatedAt" BIGINT,
    "transcriptText" TEXT
);

CREATE TABLE transcripts (
    id SERIAL PRIMARY KEY,
    "meetingId" INTEGER NOT NULL UNIQUE REFERENCES meetings(id) ON DELETE CASCADE,
    "fullText" TEXT,
    segments JSONB,
    "speakerMap" JSONB,
    language VARCHAR(50),
    "wordCount" INTEGER,
    "createdAt" BIGINT
);

CREATE TABLE action_items (
    id SERIAL PRIMARY KEY,
    "meetingId" INTEGER NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    title VARCHAR(512),
    description TEXT,
    "dueDate" BIGINT,
    status VARCHAR(50) NOT NULL DEFAULT 'open',
    priority VARCHAR(50) NOT NULL DEFAULT 'medium',
    assignee VARCHAR(255),
    "isAiGenerated" BOOLEAN DEFAULT TRUE,
    "sourceQuote" TEXT,
    "createdAt" BIGINT,
    "updatedAt" BIGINT
);

CREATE TABLE ai_analyses (
    id SERIAL PRIMARY KEY,
    "meetingId" INTEGER NOT NULL UNIQUE REFERENCES meetings(id) ON DELETE CASCADE,
    summary TEXT,
    "painPoints" JSONB,
    objections JSONB,
    "buyingSignals" JSONB,
    "nextSteps" JSONB,
    "keyQuotes" JSONB,
    "dealScore" INTEGER,
    sentiment VARCHAR(50),
    "talkRatio" JSONB,
    "createdAt" BIGINT,
    "updatedAt" BIGINT
);

CREATE TABLE spiced_reports (
    id SERIAL PRIMARY KEY,
    "meetingId" INTEGER NOT NULL UNIQUE REFERENCES meetings(id) ON DELETE CASCADE,
    situation TEXT,
    "situationConfidence" INTEGER,
    "situationAiGenerated" BOOLEAN DEFAULT TRUE,
    pain TEXT,
    "painConfidence" INTEGER,
    "painAiGenerated" BOOLEAN DEFAULT TRUE,
    impact TEXT,
    "impactConfidence" INTEGER,
    "impactAiGenerated" BOOLEAN DEFAULT TRUE,
    "criticalEvent" TEXT,
    "criticalEventConfidence" INTEGER,
    "criticalEventAiGenerated" BOOLEAN DEFAULT TRUE,
    decision TEXT,
    "decisionConfidence" INTEGER,
    "decisionAiGenerated" BOOLEAN DEFAULT TRUE,
    "overallCompleteness" INTEGER,
    "createdAt" BIGINT,
    "updatedAt" BIGINT
);

CREATE TABLE meddpicc_reports (
    id SERIAL PRIMARY KEY,
    "meetingId" INTEGER NOT NULL UNIQUE REFERENCES meetings(id) ON DELETE CASCADE,
    metrics TEXT,
    "metricsConfidence" INTEGER,
    "metricsAiGenerated" BOOLEAN DEFAULT TRUE,
    "economicBuyer" TEXT,
    "economicBuyerConfidence" INTEGER,
    "economicBuyerAiGenerated" BOOLEAN DEFAULT TRUE,
    "decisionCriteria" TEXT,
    "decisionCriteriaConfidence" INTEGER,
    "decisionCriteriaAiGenerated" BOOLEAN DEFAULT TRUE,
    "decisionProcess" TEXT,
    "decisionProcessConfidence" INTEGER,
    "decisionProcessAiGenerated" BOOLEAN DEFAULT TRUE,
    "paperProcess" TEXT,
    "paperProcessConfidence" INTEGER,
    "paperProcessAiGenerated" BOOLEAN DEFAULT TRUE,
    "identifyPain" TEXT,
    "identifyPainConfidence" INTEGER,
    "identifyPainAiGenerated" BOOLEAN DEFAULT TRUE,
    champion TEXT,
    "championConfidence" INTEGER,
    "championAiGenerated" BOOLEAN DEFAULT TRUE,
    competition TEXT,
    "competitionConfidence" INTEGER,
    "competitionAiGenerated" BOOLEAN DEFAULT TRUE,
    "overallCompleteness" INTEGER,
    "createdAt" BIGINT,
    "updatedAt" BIGINT
);

CREATE TABLE pitch_coaching (
    id SERIAL PRIMARY KEY,
    "meetingId" INTEGER NOT NULL UNIQUE REFERENCES meetings(id) ON DELETE CASCADE,
    "overallScore" INTEGER,
    "talkTimeRatio" REAL,
    "discoveryScore" INTEGER,
    "objectionScore" INTEGER,
    "valueScore" INTEGER,
    "nextStepScore" INTEGER,
    "closingScore" INTEGER,
    moments JSONB,
    strengths JSONB,
    improvements JSONB,
    "missedOpportunities" JSONB,
    "competitorsMentioned" JSONB,
    "battlecardUsed" BOOLEAN DEFAULT FALSE,
    "meddpiccCoverage" REAL,
    "createdAt" BIGINT,
    "updatedAt" BIGINT
);

CREATE TABLE pre_call_intelligence (
    id SERIAL PRIMARY KEY,
    "meetingId" INTEGER NOT NULL UNIQUE REFERENCES meetings(id) ON DELETE CASCADE,
    "companyName" VARCHAR(255),
    "companyDomain" VARCHAR(255),
    industry TEXT,
    "companySize" TEXT,
    "fundingStage" TEXT,
    "recentNews" JSONB,
    "techStack" JSONB,
    "currentTools" JSONB,
    "triggerEvents" JSONB,
    "prepBullets" JSONB,
    "suggestedOpening" TEXT,
    "leadWithProduct" TEXT,
    "buyerPersona" TEXT,
    "createdAt" BIGINT,
    "updatedAt" BIGINT
);

CREATE TABLE prospects (
    id SERIAL PRIMARY KEY,
    "sourceCompanyName" VARCHAR(255),
    "prospectCompanyName" VARCHAR(255),
    "prospectDomain" VARCHAR(255),
    industry VARCHAR(255),
    "companySize" TEXT,
    "fundingStage" TEXT,
    "contactName" VARCHAR(255),
    "contactTitle" VARCHAR(255),
    "contactLinkedin" VARCHAR(512),
    "fitReason" TEXT,
    "outreachAngle" TEXT,
    "triggerEvent" TEXT,
    "suggestedProduct" TEXT,
    status VARCHAR(100) NOT NULL DEFAULT 'new',
    notes TEXT,
    "createdAt" BIGINT,
    "updatedAt" BIGINT
);
"""

# JSON columns that need to be stored as JSONB
JSON_COLS = {
    'participants', 'segments', 'speakerMap', 'painPoints', 'objections',
    'buyingSignals', 'nextSteps', 'keyQuotes', 'talkRatio',
    'moments', 'strengths', 'improvements', 'missedOpportunities',
    'competitorsMentioned', 'recentNews', 'techStack', 'currentTools',
    'triggerEvents', 'prepBullets'
}

# Columns that are stored as 0/1 integers in MySQL but should be boolean in Postgres
BOOL_COLS = {
    'isAiGenerated', 'situationAiGenerated', 'painAiGenerated', 'impactAiGenerated',
    'criticalEventAiGenerated', 'decisionAiGenerated', 'metricsAiGenerated',
    'economicBuyerAiGenerated', 'decisionCriteriaAiGenerated', 'decisionProcessAiGenerated',
    'paperProcessAiGenerated', 'identifyPainAiGenerated', 'championAiGenerated',
    'competitionAiGenerated', 'battlecardUsed'
}

TIMESTAMP_COLS = {
    'createdAt', 'updatedAt', 'lastSignedIn', 'scheduledAt', 'startedAt',
    'endedAt', 'dueDate'
}

def to_ms(v):
    """Convert ISO datetime string or numeric to Unix milliseconds."""
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return int(v)
    if isinstance(v, str):
        for fmt in ('%Y-%m-%dT%H:%M:%S', '%Y-%m-%d %H:%M:%S', '%Y-%m-%dT%H:%M:%S.%f'):
            try:
                dt = datetime.strptime(v, fmt)
                return int(calendar.timegm(dt.timetuple()) * 1000)
            except ValueError:
                continue
    return None

def transform_row(row):
    """Transform a MySQL row dict to Postgres-compatible format."""
    new_row = {}
    for k, v in row.items():
        if k in JSON_COLS:
            if isinstance(v, str):
                try:
                    v = json.loads(v)
                except:
                    pass
            new_row[k] = json.dumps(v) if v is not None else None
        elif k in TIMESTAMP_COLS:
            new_row[k] = to_ms(v)
        elif k in BOOL_COLS:
            new_row[k] = bool(v) if v is not None else None
        elif isinstance(v, bool):
            new_row[k] = v
        else:
            new_row[k] = v
    return new_row

def insert_rows(cur, table, rows):
    if not rows:
        print(f"  {table}: 0 rows (skipped)")
        return
    transformed = [transform_row(r) for r in rows]
    cols = list(transformed[0].keys())
    # Quote all column names to preserve camelCase
    placeholders = ', '.join(['%s'] * len(cols))
    col_names = ', '.join([f'"{c}"' for c in cols])
    sql = f'INSERT INTO {table} ({col_names}) VALUES ({placeholders})'
    for row in transformed:
        values = [row.get(c) for c in cols]
        try:
            cur.execute(sql, values)
        except Exception as e:
            print(f"  ERROR inserting into {table}: {e}")
            print(f"  Row: {row}")
            raise
    print(f"  {table}: {len(rows)} rows inserted")

def main():
    print("Loading MySQL export...")
    with open('/tmp/mysql_export.json') as f:
        data = json.load(f)

    print("Connecting to Neon Postgres...")
    conn = psycopg2.connect(NEON_URL)
    conn.autocommit = False
    cur = conn.cursor()

    print("Creating schema...")
    cur.execute(SCHEMA_SQL)
    conn.commit()
    print("Schema created.")

    print("Importing data...")
    insert_rows(cur, 'users', data.get('users', []))
    conn.commit()

    insert_rows(cur, 'meetings', data.get('meetings', []))
    conn.commit()

    insert_rows(cur, 'transcripts', data.get('transcripts', []))
    conn.commit()

    insert_rows(cur, 'action_items', data.get('action_items', []))
    conn.commit()

    insert_rows(cur, 'ai_analyses', data.get('ai_analyses', []))
    conn.commit()

    insert_rows(cur, 'spiced_reports', data.get('spiced_reports', []))
    conn.commit()

    insert_rows(cur, 'meddpicc_reports', data.get('meddpicc_reports', []))
    conn.commit()

    insert_rows(cur, 'pitch_coaching', data.get('pitch_coaching', []))
    conn.commit()

    insert_rows(cur, 'pre_call_intelligence', data.get('pre_call_intelligence', []))
    conn.commit()

    insert_rows(cur, 'prospects', data.get('prospects', []))
    conn.commit()

    # Update sequences
    for table in ['users', 'meetings', 'transcripts', 'action_items', 'ai_analyses',
                  'spiced_reports', 'meddpicc_reports', 'pitch_coaching',
                  'pre_call_intelligence', 'prospects']:
        cur.execute(f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), COALESCE(MAX(id), 1)) FROM {table}")
    conn.commit()

    print("\nMigration complete!")
    cur.close()
    conn.close()

if __name__ == '__main__':
    main()
