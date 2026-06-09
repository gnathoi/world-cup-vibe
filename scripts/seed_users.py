#!/usr/bin/env python3
"""
Seed sweepstake participants from a users.txt file.

Usage:
    python scripts/seed_users.py users.txt [--admin ADMIN_USERNAME]

users.txt format (one per line, # lines are comments):
    username:password
    admin:s3cr3tPw
    alice:word-word-word

The user matching --admin (default: "admin") is created with spectator=True
so they are excluded from the team draw.

Passwords are hashed with scrypt (N=16384, r=8, p=1, dklen=64) using the
same parameters as the Node.js lib/password.ts implementation, so hashes
are compatible with the web app's verifyPassword() function.
"""

import argparse
import hashlib
import os
import secrets
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env.local")


def hash_password(password: str) -> str:
    """Produce a salt:hash string compatible with Node.js lib/password.ts."""
    # Node randomBytes(16).toString("hex") → 32-char hex salt string
    salt_hex = secrets.token_hex(16)
    # Node passes salt as a string (UTF-8 bytes) to scrypt
    key = hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt_hex.encode("utf-8"),
        n=16384,
        r=8,
        p=1,
        dklen=64,
    )
    return f"{salt_hex}:{key.hex()}"


def parse_users(path: str) -> list[dict]:
    users = []
    with open(path, encoding="utf-8") as f:
        for lineno, raw in enumerate(f, 1):
            line = raw.strip()
            if not line or line.startswith("#"):
                continue
            parts = line.split(":", 1)
            if len(parts) != 2:
                print(f"  SKIP line {lineno}: expected 'username:password', got: {raw!r}")
                continue
            username, password = parts[0].strip(), parts[1].strip()
            if not username or not password:
                print(f"  SKIP line {lineno}: blank username or password")
                continue
            users.append({"username": username, "password": password})
    return users


def main():
    parser = argparse.ArgumentParser(description="Seed sweepstake users from users.txt")
    parser.add_argument("users_file", help="Path to users.txt")
    parser.add_argument(
        "--admin",
        default="admin",
        help="Username to mark as spectator (excluded from draw). Default: admin",
    )
    args = parser.parse_args()

    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local")
        sys.exit(1)

    sb = create_client(url, key)

    users = parse_users(args.users_file)
    if not users:
        print("No users found in file. Exiting.")
        sys.exit(1)

    admin_username = args.admin.lower()
    print(f"\nSeeding {len(users)} user(s) — admin username: '{admin_username}'\n")

    now = datetime.now(timezone.utc).isoformat()
    rows = []
    for u in users:
        is_admin = u["username"].lower() == admin_username
        pw_hash = hash_password(u["password"])
        rows.append({
            "id": str(uuid.uuid4()),
            "display_name": u["username"],
            "email": None,
            "signed_up_at": now,
            "spectator": is_admin,
            "paid_in": False,
            "password_hash": pw_hash,
        })
        role = "ADMIN (spectator)" if is_admin else "player"
        print(f"  {u['username']!r:20s}  [{role}]  hash={pw_hash[:20]}...")

    result = sb.table("participants").insert(rows).execute()
    print(f"\nInserted {len(result.data)} participants.")


if __name__ == "__main__":
    main()
