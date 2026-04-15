#!/usr/bin/env python3
"""Add all required environment variables to the Vercel project via the Vercel API."""
import json
import subprocess
import sys

VERCEL_TOKEN = "VERCEL_TOKEN_REDACTED"
PROJECT_ID = "prj_mRCT4CWcQIj840M4RVmeGjShcver"
API_BASE = "https://api.vercel.com"

# All required environment variables
# target: "production", "preview", "development" — we set all three
ENV_VARS = [
    {
        "key": "DATABASE_URL",
        "value": 'mysql://3XzMR6exhZEn1DL.a4fde2aa4cd7:ML4D7L9mfsAk46rB7GXR@gateway05.us-east-1.prod.aws.tidbcloud.com:4000/i5UAP5JRgPnNifM9y6ZxHx?ssl={"rejectUnauthorized":true}',
        "type": "encrypted",
    },
    {
        "key": "JWT_SECRET",
        "value": "6FLk63Tku4ANm3C8CzphGw",
        "type": "encrypted",
    },
    {
        "key": "OAUTH_SERVER_URL",
        "value": "https://api.manus.im",
        "type": "plain",
    },
    {
        "key": "VITE_APP_ID",
        "value": "i5UAP5JRgPnNifM9y6ZxHx",
        "type": "plain",
    },
    {
        "key": "OWNER_OPEN_ID",
        "value": "hEUMjGNehixMXqeMhaudHA",
        "type": "plain",
    },
    {
        "key": "OWNER_NAME",
        "value": "Saransh Udayashankara Shetty",
        "type": "plain",
    },
    {
        "key": "BUILT_IN_FORGE_API_URL",
        "value": "https://forge.manus.ai",
        "type": "plain",
    },
    {
        "key": "BUILT_IN_FORGE_API_KEY",
        "value": "Rog6gkWf5L8NhpRcU7DS8y",
        "type": "encrypted",
    },
    {
        "key": "VITE_FRONTEND_FORGE_API_URL",
        "value": "https://forge.manus.ai",
        "type": "plain",
    },
    {
        "key": "VITE_FRONTEND_FORGE_API_KEY",
        "value": "mQ6V9tURyLAA73Mvmv6osq",
        "type": "encrypted",
    },
    {
        "key": "VITE_OAUTH_PORTAL_URL",
        "value": "https://manus.im",
        "type": "plain",
    },
    {
        "key": "NODE_ENV",
        "value": "production",
        "type": "plain",
    },
]

def add_env_var(key, value, var_type):
    payload = json.dumps({
        "key": key,
        "value": value,
        "type": var_type,
        "target": ["production", "preview", "development"],
    })
    result = subprocess.run(
        [
            "curl", "-s", "-X", "POST",
            f"{API_BASE}/v10/projects/{PROJECT_ID}/env",
            "-H", f"Authorization: Bearer {VERCEL_TOKEN}",
            "-H", "Content-Type: application/json",
            "-d", payload,
        ],
        capture_output=True,
        text=True,
    )
    response = json.loads(result.stdout)
    if "error" in response:
        # If already exists, try to update
        if response["error"].get("code") == "ENV_ALREADY_EXISTS":
            print(f"  ⚠ {key} already exists — skipping (already set)")
        else:
            print(f"  ✗ {key}: {response['error']}")
        return False
    else:
        print(f"  ✓ {key}")
        return True

print(f"Adding {len(ENV_VARS)} environment variables to Vercel project '{PROJECT_ID}'...\n")
success = 0
for var in ENV_VARS:
    if add_env_var(var["key"], var["value"], var["type"]):
        success += 1

print(f"\nDone: {success}/{len(ENV_VARS)} variables added successfully.")
