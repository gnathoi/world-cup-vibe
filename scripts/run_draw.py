#!/usr/bin/env python3
"""
Run the team draw and write the result to Supabase.

Usage:
    python scripts/run_draw.py [--admin ADMIN_USERNAME] [--runs N] [--out PATH]

Steps:
  1. Fetch eligible participants (non-spectator) from Supabase.
  2. Run N random Fisher-Yates draws (default 10 000), distributing 48 teams
     as equally as possible (floor(48/players) each; remainder goes one-extra
     to a random subset). Host-nation guard: USA/CAN/MEX each go to a
     different participant when players >= 3.
  3. Tally how many times each (participant, team) pair appeared — proves
     uniformity — and save a heatmap to public/draw_distribution.png.
  4. Pick one draw at random from the 10 000 and write it to Supabase.
"""

import argparse
import os
import random
import sys
from datetime import datetime, timezone
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from dotenv import load_dotenv
from supabase import create_client

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env.local")

# 48 teams — mirrors lib/teams.ts
# Source: https://raw.githubusercontent.com/openfootball/worldcup.json/refs/heads/master/2026/worldcup.teams.json
TEAMS = [
    "USA", "CAN", "MEX",
    "ENG", "FRA", "GER", "ESP", "POR", "NED", "BEL",
    "CRO", "SUI", "AUT", "TUR", "SCO", "BIH", "CZE", "NOR", "SWE",
    "ARG", "BRA", "URU", "COL", "ECU", "PAR",
    "MAR", "SEN", "TUN", "EGY", "ALG", "CIV", "GHA", "RSA", "CPV",
    "JPN", "KOR", "AUS", "IRN", "KSA", "QAT", "UZB", "IRQ",
    "PAN", "CUW", "HAI",
    "NZL",
    "JOR", "COD",
]
assert len(TEAMS) == 48, f"Expected 48 teams, got {len(TEAMS)}"

HOST_NATIONS = {"USA", "CAN", "MEX"}


def fisher_yates_draw(participants: list[str], rng: random.Random) -> dict[str, list[str]]:
    """
    Distribute TEAMS across participants as equally as possible.
    Host-nation guard: USA/CAN/MEX go to three different participants
    when len(participants) >= 3.
    Returns dict: participant_id -> list of team codes.
    """
    n = len(participants)
    # Sort participants for stability across runs
    ps = sorted(participants)

    teams = TEAMS[:]
    rng.shuffle(teams)

    hosts = [t for t in teams if t in HOST_NATIONS]
    non_hosts = [t for t in teams if t not in HOST_NATIONS]

    result: dict[str, list[str]] = {p: [] for p in ps}

    # Quota: base = floor(48/n), extras participants get base+1
    base = len(TEAMS) // n
    extras = len(TEAMS) % n
    extra_ps = set(rng.sample(ps, k=extras))
    quotas = {p: base + (1 if p in extra_ps else 0) for p in ps}

    # Distribute hosts one-per-participant, deducting from quota
    if n >= len(hosts):
        recipients = rng.sample(ps, k=len(hosts))
        for p, h in zip(recipients, hosts):
            result[p].append(h)
            quotas[p] -= 1
    else:
        non_hosts.extend(hosts)

    # Fill remaining quota slots from shuffled non-hosts
    rng.shuffle(non_hosts)
    qi = 0
    for p in ps:
        for _ in range(quotas[p]):
            result[p].append(non_hosts[qi])
            qi += 1

    # Sort each participant's list for stable display
    for p in ps:
        result[p].sort()

    return result


def run_draws(participants: list[str], n_runs: int) -> list[dict[str, list[str]]]:
    draws = []
    for _ in range(n_runs):
        rng = random.Random(os.urandom(16))
        draws.append(fisher_yates_draw(participants, rng))
    return draws


def build_tally(
    participants: list[str], draws: list[dict[str, list[str]]]
) -> np.ndarray:
    """Returns matrix[participant_idx][team_idx] = count."""
    ps_sorted = sorted(participants)
    tally = np.zeros((len(ps_sorted), len(TEAMS)), dtype=np.int32)
    for draw in draws:
        for pi, p in enumerate(ps_sorted):
            for team in draw[p]:
                ti = TEAMS.index(team)
                tally[pi][ti] += 1
    return tally, ps_sorted


def plot_heatmap(tally: np.ndarray, participants: list[str], out_path: Path) -> None:
    fig, ax = plt.subplots(figsize=(max(16, len(TEAMS) * 0.38), max(4, len(participants) * 0.5 + 2)))
    im = ax.imshow(tally, aspect="auto", cmap="YlOrRd")
    ax.set_xticks(range(len(TEAMS)))
    ax.set_xticklabels(TEAMS, rotation=90, fontsize=7)
    ax.set_yticks(range(len(participants)))
    ax.set_yticklabels(participants, fontsize=9)
    ax.set_xlabel("Team", fontsize=10)
    ax.set_ylabel("Participant", fontsize=10)
    n_runs = int(tally.sum() / len(TEAMS))
    ax.set_title(
        f"Team Draw Distribution — {n_runs:,} simulations\n"
        f"Uniform allocation: each cell ≈ {n_runs / len(participants):.0f}",
        fontsize=11,
    )
    plt.colorbar(im, ax=ax, label="Times allocated")
    plt.tight_layout()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(out_path, dpi=120, bbox_inches="tight")
    plt.close(fig)
    print(f"  Saved heatmap → {out_path}")


def write_allocation(sb, participants_rows: list[dict], draw: dict[str, list[str]]) -> None:
    by_participant = [
        {"participantId": p_id, "teamCodes": codes}
        for p_id, codes in draw.items()
    ]
    now = datetime.now(timezone.utc).isoformat()
    sb.table("allocations").upsert(
        {
            "id": 1,
            "seed": f"python-draw-{now[:10]}",
            "allocated_at": now,
            "by_participant": by_participant,
        },
        on_conflict="id",
    ).execute()


def main():
    parser = argparse.ArgumentParser(description="Run team draw and write to Supabase")
    parser.add_argument("--admin", default="admin", help="Admin username (excluded from draw)")
    parser.add_argument("--runs", type=int, default=10_000, help="Number of simulations")
    parser.add_argument(
        "--out",
        default="public/draw_distribution.png",
        help="Output path for heatmap",
    )
    args = parser.parse_args()

    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local")
        sys.exit(1)

    sb = create_client(url, key)

    # Fetch eligible participants (non-spectator)
    result = sb.table("participants").select("*").eq("spectator", False).execute()
    rows = result.data
    if not rows:
        print("No eligible participants found. Run seed_users.py first.")
        sys.exit(1)

    participants = [r["id"] for r in rows]
    id_to_name = {r["id"]: r["display_name"] for r in rows}
    print(f"\nEligible participants ({len(participants)}): {[id_to_name[p] for p in sorted(participants)]}")
    print(f"Running {args.runs:,} draws...\n")

    draws = run_draws(participants, args.runs)

    tally, ps_sorted = build_tally(participants, draws)
    ps_names = [id_to_name[p] for p in ps_sorted]

    # Print distribution stats
    expected = args.runs / len(participants)
    print(f"Expected frequency per (participant, team) cell: {expected:.1f}")
    print(f"Actual range: {tally.min()} – {tally.max()}")
    col_totals = tally.sum(axis=0)
    print(f"Teams total across all draws range: {col_totals.min()} – {col_totals.max()} (expected {args.runs:,})")

    # Generate heatmap
    out_path = ROOT / args.out
    print(f"\nGenerating heatmap...")
    plot_heatmap(tally, ps_names, out_path)

    # Pick one draw at random
    chosen_idx = random.randrange(len(draws))
    chosen = draws[chosen_idx]
    print(f"\nSelected draw #{chosen_idx + 1} of {args.runs:,}:")
    for p_id in ps_sorted:
        name = id_to_name[p_id]
        teams = chosen[p_id]
        print(f"  {name:20s}  {' '.join(teams)}")

    # Write to Supabase
    write_allocation(sb, rows, chosen)
    print(f"\nAllocation written to Supabase.")
    print("Done.")


if __name__ == "__main__":
    main()
