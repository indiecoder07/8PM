# PRD — FieldIQ: Indoor Cricket Fielding Tracker

**Version:** 1.0  
**Type:** Hobby / Personal App  
**Stack:** React + localStorage / Supabase, Claude Vision API

---

## Overview

A simple admin-run web app to track fielding performance and batting/bowling stats for an indoor cricket team, organised by season and match.

---

## Core Entities

| Entity | Key Fields |
|--------|-----------|
| Player | Name, jersey number, avatar, active status |
| Season | Name, start date, end date |
| Match | Season, date, opponent team, result (W/L/D), our score, opponent score |
| Fielding Event | Match, player, event type, timestamp |
| Scoresheet Stats | Match, player, RS, SR, OB, RC, Wkts, Econ, C (RS−RC) |

---

## Features

### 1. Player Management
- Add and delete players
- Jersey number and avatar/photo upload
- Active / inactive toggle (preserves historical data)
- Player profile page with career stats summary

### 2. Season & Match Management
- Create seasons (e.g. "2024 Season 1") with start/end dates
- Add matches under a season with date, opponent name, result, and scores

### 3. Live Fielding Event Logger
- Select a match and player, then tap one of four event buttons:
  - Catch taken ✓
  - Catch dropped ✗
  - Run out taken ✓
  - Run out missed ✗
- Events saved instantly with timestamp
- Match timeline view showing all events chronologically

### 4. Scoresheet Upload & Auto-Extraction
- Admin uploads a post-match scoresheet image against a match
- Claude Vision API reads the image and extracts per-player stats:
  - RS (runs scored), SR (strike rate)
  - OB (overs bowled), RC (runs conceded), Wkts, Econ
  - C = RS − RC (contribution score)
- Extracted data is auto-matched to players by name and pre-filled
- Stats saved against the match record

### 5. Stats & Performance Views
- **Season summary** — all players aggregated across a season
- **Match breakdown** — per-player stats for a specific match
- **Player leaderboard** — ranked by fielding success rate and C score
- **Success rate trend** — player improvement across matches over time
- **Filters:** Season, Match, Player, Date range, Opponent team
- **Export** to PDF or CSV

### 6. Dashboard
- Active players count, matches played, wins, total events logged
- Top fielders by success rate
- Recent events feed
- Season at-a-glance (matches, wins, losses)

### 7. UI
- Dark / light mode toggle
- Player avatars with photo upload
- Responsive layout

---

## Data Streams

**Stream 1 — Live (during match):** Admin logs fielding events manually in real time per player.

**Stream 2 — Post-match:** Admin uploads scoresheet image; Claude Vision API extracts batting and bowling stats automatically.

Both streams are stored together on the player profile.

---

## Out of Scope (v1)
- Notes per event
- Ground fielding / misfields
- Player positions
- Multi-team / division tagging
- Squad selection per match
- Push notifications
