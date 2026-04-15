#!/usr/bin/env python3
"""Run the full SalesLens analysis pipeline and save results to file."""
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
    headers={"Content-Type": "application/json"},
    method="POST"
)

print("Running analysis... (30-90 seconds)")
try:
    with urllib.request.urlopen(req, timeout=180) as resp:
        response_text = resp.read().decode('utf-8')
        data = json.loads(response_text)
        result = data.get('result', {}).get('data', {})
        if isinstance(result, dict) and 'json' in result:
            result = result['json']
        
        # Save full result
        with open('/tmp/analysis_result.json', 'w') as f:
            json.dump(result, f, indent=2)
        print("Full result saved to /tmp/analysis_result.json")
        
        # Print summary
        if 'analysis' in result:
            a = result['analysis']
            print("\n" + "="*60)
            print("CORE ANALYSIS")
            print("="*60)
            print(f"Summary: {a.get('summary', 'N/A')}")
            print(f"Deal Score: {a.get('dealScore', 'N/A')}/100")
            print(f"Sentiment: {a.get('sentiment', 'N/A')}")
            tr = a.get('talkRatio', {})
            print(f"Talk Ratio: Rep {tr.get('rep', '?')}% / Prospect {tr.get('prospect', '?')}%")
            
            print(f"\nPain Points ({len(a.get('painPoints', []))}):")
            for p in a.get('painPoints', []):
                print(f"  - {p['text']} (conf: {p.get('confidence', '?')})")
            
            print(f"\nObjections ({len(a.get('objections', []))}):")
            for o in a.get('objections', []):
                print(f"  - {o['text']} (conf: {o.get('confidence', '?')})")
            
            print(f"\nBuying Signals ({len(a.get('buyingSignals', []))}):")
            for b in a.get('buyingSignals', []):
                print(f"  - {b['text']} (conf: {b.get('confidence', '?')})")
            
            print(f"\nNext Steps ({len(a.get('nextSteps', []))}):")
            for n in a.get('nextSteps', []):
                print(f"  - {n['text']}")
        
        if 'spiced' in result:
            s = result['spiced']
            print("\n" + "="*60)
            print("SPICED REPORT")
            print("="*60)
            for field in ['situation', 'pain', 'impact', 'criticalEvent', 'decision']:
                val = s.get(field, 'N/A')
                conf = s.get(f'{field}Confidence', '?')
                print(f"\n{field.upper()} (conf: {conf}):")
                print(f"  {val}")
        
        if 'meddpicc' in result:
            m = result['meddpicc']
            print("\n" + "="*60)
            print("MEDDPICC REPORT")
            print("="*60)
            for field in ['metrics', 'economicBuyer', 'decisionCriteria', 'decisionProcess', 'paperProcess', 'identifyPain', 'champion', 'competition']:
                val = m.get(field, 'N/A')
                conf = m.get(f'{field}Confidence', '?')
                print(f"\n{field.upper()} (conf: {conf}):")
                print(f"  {val}")
        
        if 'pitchCoaching' in result:
            pc = result['pitchCoaching']
            print("\n" + "="*60)
            print("PITCH COACHING")
            print("="*60)
            print(f"Overall Score: {pc.get('overallScore', 'N/A')}/100")
            print(f"Summary: {pc.get('coachingSummary', 'N/A')}")
            moments = pc.get('coachingMoments', [])
            print(f"\nCoaching Moments ({len(moments)}):")
            for i, m in enumerate(moments[:5], 1):
                print(f"\n  {i}. What was said: \"{m.get('whatWasSaid', '')}\"")
                print(f"     What to say instead: \"{m.get('whatToSayInstead', '')}\"")
                print(f"     Why: {m.get('why', '')}")
        
        if 'preCallIntelligence' in result:
            pci = result['preCallIntelligence']
            print("\n" + "="*60)
            print("PRE-CALL INTELLIGENCE")
            print("="*60)
            print(f"Company: {pci.get('companyName', 'N/A')}")
            print(f"Industry: {pci.get('industry', 'N/A')}")
            print(f"Funding Stage: {pci.get('fundingStage', 'N/A')}")
            print(f"Buyer Persona: {pci.get('buyerPersona', 'N/A')}")
            print(f"Lead With: {pci.get('leadWithProduct', 'N/A')}")
            print(f"Suggested Opening: {pci.get('suggestedOpening', 'N/A')}")
            print(f"\nTrigger Events:")
            for te in pci.get('triggerEvents', []):
                print(f"  - [{te.get('urgency', '?').upper()}] {te.get('event', '')}: {te.get('relevance', '')}")
            print(f"\nPrep Bullets:")
            for pb in pci.get('prepBullets', []):
                print(f"  - {pb}")
        
        if 'actionItems' in result:
            ai = result['actionItems']
            print("\n" + "="*60)
            print(f"ACTION ITEMS ({len(ai)})")
            print("="*60)
            for item in ai:
                print(f"  [{item.get('priority', '?').upper()}] {item.get('title', '')}")
                print(f"    Owner: {item.get('owner', '?')} | Due: {item.get('dueDate', '?')}")
                print(f"    {item.get('description', '')}")
        
        if 'prospects' in result:
            pros = result['prospects']
            print("\n" + "="*60)
            print(f"SIMILAR PROSPECTS ({len(pros)})")
            print("="*60)
            for p in pros:
                print(f"\n  {p.get('prospectCompanyName', '?')} ({p.get('prospectDomain', '?')})")
                print(f"  Industry: {p.get('industry', '?')} | Size: {p.get('companySize', '?')}")
                print(f"  Fit: {p.get('fitReason', '?')}")
                print(f"  Angle: {p.get('outreachAngle', '?')}")
        
        print("\n" + "="*60)
        print("ANALYSIS COMPLETE")
        print("="*60)

except urllib.error.HTTPError as e:
    print(f"HTTP Error {e.code}: {e.reason}")
    body = e.read().decode('utf-8')
    print("Body:", body[:2000])
except Exception as e:
    print(f"Error: {type(e).__name__}: {e}")
