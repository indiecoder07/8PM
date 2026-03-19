-- ═══════════════════════════════════════════════════════════════════════════
-- 8PM FieldIQ — Neon bulk data seed
-- Run these queries IN ORDER in the Neon SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. SEASON ──────────────────────────────────────────────────────────────

INSERT INTO seasons (id, name, start_date, end_date)
VALUES ('season-2025s2', '2025 Season 2', '2025-12-11', '2026-03-19')
ON CONFLICT (id) DO NOTHING;

-- ── 2. PLAYERS ─────────────────────────────────────────────────────────────
-- Uses ON CONFLICT so existing players won't be duplicated.

INSERT INTO players (id, name, number, active, color) VALUES
  ('player-sapan',    'Sapan Bhatt',     '09', true, '#84a59d'),
  ('player-manish',   'Manish',          '77', true, '#f2cc8f'),
  ('player-popli',    'M M Popli',       '05', true, '#e07a5f'),
  ('player-bhavin',   'Bhavin Parmar',   '4',  true, '#81b29a'),
  ('player-jollyboy', 'JollyBoy Shah',   '27', true, '#f4f1de'),
  ('player-rohit',    'Rohit Goel',      '',   true, '#3d405b'),
  ('player-prateek',  'Prateek Khanna',  '7',  true, '#e07a5f'),
  ('player-deepak',   'Deepak Chhabra',  '11', true, '#81b29a'),
  ('player-aaryan',   'Aaryan Parmar',   '10', true, '#f2cc8f'),
  ('player-mayank',   'Mayank Ghosh',    '16', true, '#84a59d'),
  ('player-aj',       'AJ',              '99', true, '#f4f1de')
ON CONFLICT (id) DO UPDATE SET
  name   = EXCLUDED.name,
  number = EXCLUDED.number,
  active = EXCLUDED.active;

-- ── 3. OPPONENTS ───────────────────────────────────────────────────────────

INSERT INTO opponents (id, name) VALUES
  ('opp-xmen',       'X-Men'),
  ('opp-apex',       'Apex'),
  ('opp-midwicket',  'Midwicket Crisis'),
  ('opp-5plus1',     '5+1'),
  ('opp-abcc',       'ABCC Masters'),
  ('opp-abitiffy',   'ABitIffy'),
  ('opp-bbcc',       'BBCC'),
  ('opp-sticky',     'Sticky Wickets')
ON CONFLICT (name) DO NOTHING;

-- ── 4. MATCHES ─────────────────────────────────────────────────────────────
-- First score = 8PM, second score = opposition

INSERT INTO matches (id, season_id, date, opponent, result, our_score, opponent_score) VALUES
  ('match-20251211', 'season-2025s2', '2025-12-11', 'X-Men',            'L', 112, 141),
  ('match-20251218', 'season-2025s2', '2025-12-18', 'Apex',             'W', 106,  98),
  ('match-20260108', 'season-2025s2', '2026-01-08', 'Midwicket Crisis', 'L',  73, 104),
  ('match-20260115', 'season-2025s2', '2026-01-15', '5+1',              'W', 128,  35),
  ('match-20260122', 'season-2025s2', '2026-01-22', 'ABCC Masters',     'W',  99,  45),
  ('match-20260129', 'season-2025s2', '2026-01-29', 'ABitIffy',         'L',  70,  79),
  ('match-20260205', 'season-2025s2', '2026-02-05', '5+1',              'W', 155,  72),
  ('match-20260212', 'season-2025s2', '2026-02-12', 'Midwicket Crisis', 'W', 128, 116),
  ('match-20260219', 'season-2025s2', '2026-02-19', 'X-Men',            'L',  93, 114),
  ('match-20260226', 'season-2025s2', '2026-02-26', 'Apex',             'W', 126, 112),
  ('match-20260305', 'season-2025s2', '2026-03-05', 'BBCC',             'W', 151,  32),
  ('match-20260312', 'season-2025s2', '2026-03-12', 'Sticky Wickets',   'W',  95,  45)
ON CONFLICT (id) DO UPDATE SET
  our_score      = EXCLUDED.our_score,
  opponent_score = EXCLUDED.opponent_score,
  result         = EXCLUDED.result;

-- ── 5. SCORECARDS (season averages per match) ──────────────────────────────
-- NOTE: Your stats image shows SEASON TOTALS. Since scorecards are per-match,
-- I'm dividing totals by games played (G column) to get per-game averages.
-- This gives you representative data for each match. You can later edit
-- individual match stats via the Stats page if you have the actual scoresheets.
--
-- Mapping from your stats table:
--   R  → rs (total runs scored)    |  G = games played
--   SR → sr (strike rate)          |  Averages: rs=R/G, ob=OB/G, rc=RC/G, wkts=W/G
--   OB → ob (overs bowled)         |  SR and Econ are already rates, used as-is
--   RC → rc (runs conceded)        |  C/G = contribution per game
--   W  → wkts (wickets)            |
--   C  → c (contribution score)    |
--   Economy = RC / OB (per game)   |

-- Helper: Generate 12 scorecards per player (one per match), using per-game averages.
-- Player: Sapan Bhatt (G=10, R=170, SR=147.83, OB=20, W=31, RC=0, C=170, Econ=0.00)
-- Per game: rs=17, sr=147.83, ob=2, rc=0, wkts=3.1, econ=0.00, c=17

INSERT INTO scorecards (id, match_id, player_id, rs, sr, ob, rc, wkts, econ, c) VALUES
  -- Sapan Bhatt: 10 games, R=170, SR=147.83, OB=20, RC=0, W=31, Econ=0.00, C=170
  ('sc-sapan-01', 'match-20251211', 'player-sapan', 17.0, 147.83, 2.0, 0.0, 3.1, 0.00, 17.0),
  ('sc-sapan-02', 'match-20251218', 'player-sapan', 17.0, 147.83, 2.0, 0.0, 3.1, 0.00, 17.0),
  ('sc-sapan-03', 'match-20260108', 'player-sapan', 17.0, 147.83, 2.0, 0.0, 3.1, 0.00, 17.0),
  ('sc-sapan-04', 'match-20260115', 'player-sapan', 17.0, 147.83, 2.0, 0.0, 3.1, 0.00, 17.0),
  ('sc-sapan-05', 'match-20260122', 'player-sapan', 17.0, 147.83, 2.0, 0.0, 3.1, 0.00, 17.0),
  ('sc-sapan-06', 'match-20260129', 'player-sapan', 17.0, 147.83, 2.0, 0.0, 3.1, 0.00, 17.0),
  ('sc-sapan-07', 'match-20260205', 'player-sapan', 17.0, 147.83, 2.0, 0.0, 3.1, 0.00, 17.0),
  ('sc-sapan-08', 'match-20260212', 'player-sapan', 17.0, 147.83, 2.0, 0.0, 3.1, 0.00, 17.0),
  ('sc-sapan-09', 'match-20260219', 'player-sapan', 17.0, 147.83, 2.0, 0.0, 3.1, 0.00, 17.0),
  ('sc-sapan-10', 'match-20260226', 'player-sapan', 17.0, 147.83, 2.0, 0.0, 3.1, 0.00, 17.0),

  -- Manish: 10 games, R=130, SR=107.44, OB=20, RC=27, W=32, Econ=2.70, C=103
  ('sc-manish-01', 'match-20251211', 'player-manish', 13.0, 107.44, 2.0, 2.7, 3.2, 2.70, 10.3),
  ('sc-manish-02', 'match-20251218', 'player-manish', 13.0, 107.44, 2.0, 2.7, 3.2, 2.70, 10.3),
  ('sc-manish-03', 'match-20260108', 'player-manish', 13.0, 107.44, 2.0, 2.7, 3.2, 2.70, 10.3),
  ('sc-manish-04', 'match-20260115', 'player-manish', 13.0, 107.44, 2.0, 2.7, 3.2, 2.70, 10.3),
  ('sc-manish-05', 'match-20260122', 'player-manish', 13.0, 107.44, 2.0, 2.7, 3.2, 2.70, 10.3),
  ('sc-manish-06', 'match-20260129', 'player-manish', 13.0, 107.44, 2.0, 2.7, 3.2, 2.70, 10.3),
  ('sc-manish-07', 'match-20260205', 'player-manish', 13.0, 107.44, 2.0, 2.7, 3.2, 2.70, 10.3),
  ('sc-manish-08', 'match-20260212', 'player-manish', 13.0, 107.44, 2.0, 2.7, 3.2, 2.70, 10.3),
  ('sc-manish-09', 'match-20260219', 'player-manish', 13.0, 107.44, 2.0, 2.7, 3.2, 2.70, 10.3),
  ('sc-manish-10', 'match-20260226', 'player-manish', 13.0, 107.44, 2.0, 2.7, 3.2, 2.70, 10.3),

  -- M M Popli: 9 games, R=137, SR=120.18, OB=18, RC=64, W=16, Econ=7.11, C=73
  ('sc-popli-01', 'match-20251211', 'player-popli', 15.22, 120.18, 2.0, 7.11, 1.78, 7.11, 8.11),
  ('sc-popli-02', 'match-20251218', 'player-popli', 15.22, 120.18, 2.0, 7.11, 1.78, 7.11, 8.11),
  ('sc-popli-03', 'match-20260108', 'player-popli', 15.22, 120.18, 2.0, 7.11, 1.78, 7.11, 8.11),
  ('sc-popli-04', 'match-20260115', 'player-popli', 15.22, 120.18, 2.0, 7.11, 1.78, 7.11, 8.11),
  ('sc-popli-05', 'match-20260122', 'player-popli', 15.22, 120.18, 2.0, 7.11, 1.78, 7.11, 8.11),
  ('sc-popli-06', 'match-20260129', 'player-popli', 15.22, 120.18, 2.0, 7.11, 1.78, 7.11, 8.11),
  ('sc-popli-07', 'match-20260205', 'player-popli', 15.22, 120.18, 2.0, 7.11, 1.78, 7.11, 8.11),
  ('sc-popli-08', 'match-20260212', 'player-popli', 15.22, 120.18, 2.0, 7.11, 1.78, 7.11, 8.11),
  ('sc-popli-09', 'match-20260219', 'player-popli', 15.22, 120.18, 2.0, 7.11, 1.78, 7.11, 8.11),

  -- Bhavin Parmar: 2 games, R=30, SR=150.00, OB=4, RC=19, W=4, Econ=9.50, C=11
  ('sc-bhavin-01', 'match-20251211', 'player-bhavin', 15.0, 150.00, 2.0, 9.5, 2.0, 9.50, 5.5),
  ('sc-bhavin-02', 'match-20251218', 'player-bhavin', 15.0, 150.00, 2.0, 9.5, 2.0, 9.50, 5.5),

  -- JollyBoy Shah: 11 games, R=195, SR=135.42, OB=22, RC=148, W=18, Econ=13.45, C=47
  ('sc-jolly-01', 'match-20251211', 'player-jollyboy', 17.73, 135.42, 2.0, 13.45, 1.64, 13.45, 4.27),
  ('sc-jolly-02', 'match-20251218', 'player-jollyboy', 17.73, 135.42, 2.0, 13.45, 1.64, 13.45, 4.27),
  ('sc-jolly-03', 'match-20260108', 'player-jollyboy', 17.73, 135.42, 2.0, 13.45, 1.64, 13.45, 4.27),
  ('sc-jolly-04', 'match-20260115', 'player-jollyboy', 17.73, 135.42, 2.0, 13.45, 1.64, 13.45, 4.27),
  ('sc-jolly-05', 'match-20260122', 'player-jollyboy', 17.73, 135.42, 2.0, 13.45, 1.64, 13.45, 4.27),
  ('sc-jolly-06', 'match-20260129', 'player-jollyboy', 17.73, 135.42, 2.0, 13.45, 1.64, 13.45, 4.27),
  ('sc-jolly-07', 'match-20260205', 'player-jollyboy', 17.73, 135.42, 2.0, 13.45, 1.64, 13.45, 4.27),
  ('sc-jolly-08', 'match-20260212', 'player-jollyboy', 17.73, 135.42, 2.0, 13.45, 1.64, 13.45, 4.27),
  ('sc-jolly-09', 'match-20260219', 'player-jollyboy', 17.73, 135.42, 2.0, 13.45, 1.64, 13.45, 4.27),
  ('sc-jolly-10', 'match-20260226', 'player-jollyboy', 17.73, 135.42, 2.0, 13.45, 1.64, 13.45, 4.27),
  ('sc-jolly-11', 'match-20260305', 'player-jollyboy', 17.73, 135.42, 2.0, 13.45, 1.64, 13.45, 4.27),

  -- Rohit Goel: 7 games, R=95, SR=114.46, OB=14, RC=72, W=7, Econ=10.29, C=23
  ('sc-rohit-01', 'match-20251211', 'player-rohit', 13.57, 114.46, 2.0, 10.29, 1.0, 10.29, 3.29),
  ('sc-rohit-02', 'match-20251218', 'player-rohit', 13.57, 114.46, 2.0, 10.29, 1.0, 10.29, 3.29),
  ('sc-rohit-03', 'match-20260108', 'player-rohit', 13.57, 114.46, 2.0, 10.29, 1.0, 10.29, 3.29),
  ('sc-rohit-04', 'match-20260115', 'player-rohit', 13.57, 114.46, 2.0, 10.29, 1.0, 10.29, 3.29),
  ('sc-rohit-05', 'match-20260122', 'player-rohit', 13.57, 114.46, 2.0, 10.29, 1.0, 10.29, 3.29),
  ('sc-rohit-06', 'match-20260129', 'player-rohit', 13.57, 114.46, 2.0, 10.29, 1.0, 10.29, 3.29),
  ('sc-rohit-07', 'match-20260205', 'player-rohit', 13.57, 114.46, 2.0, 10.29, 1.0, 10.29, 3.29),

  -- Prateek Khanna: 10 games, R=132, SR=113.79, OB=20, RC=115, W=11, Econ=11.50, C=17
  ('sc-prateek-01', 'match-20251211', 'player-prateek', 13.20, 113.79, 2.0, 11.50, 1.1, 11.50, 1.70),
  ('sc-prateek-02', 'match-20251218', 'player-prateek', 13.20, 113.79, 2.0, 11.50, 1.1, 11.50, 1.70),
  ('sc-prateek-03', 'match-20260108', 'player-prateek', 13.20, 113.79, 2.0, 11.50, 1.1, 11.50, 1.70),
  ('sc-prateek-04', 'match-20260115', 'player-prateek', 13.20, 113.79, 2.0, 11.50, 1.1, 11.50, 1.70),
  ('sc-prateek-05', 'match-20260122', 'player-prateek', 13.20, 113.79, 2.0, 11.50, 1.1, 11.50, 1.70),
  ('sc-prateek-06', 'match-20260129', 'player-prateek', 13.20, 113.79, 2.0, 11.50, 1.1, 11.50, 1.70),
  ('sc-prateek-07', 'match-20260205', 'player-prateek', 13.20, 113.79, 2.0, 11.50, 1.1, 11.50, 1.70),
  ('sc-prateek-08', 'match-20260212', 'player-prateek', 13.20, 113.79, 2.0, 11.50, 1.1, 11.50, 1.70),
  ('sc-prateek-09', 'match-20260219', 'player-prateek', 13.20, 113.79, 2.0, 11.50, 1.1, 11.50, 1.70),
  ('sc-prateek-10', 'match-20260226', 'player-prateek', 13.20, 113.79, 2.0, 11.50, 1.1, 11.50, 1.70),

  -- Deepak Chhabra: 6 games, R=74, SR=85.06, OB=12, RC=68, W=8, Econ=11.33, C=6
  ('sc-deepak-01', 'match-20251211', 'player-deepak', 12.33, 85.06, 2.0, 11.33, 1.33, 11.33, 1.0),
  ('sc-deepak-02', 'match-20251218', 'player-deepak', 12.33, 85.06, 2.0, 11.33, 1.33, 11.33, 1.0),
  ('sc-deepak-03', 'match-20260108', 'player-deepak', 12.33, 85.06, 2.0, 11.33, 1.33, 11.33, 1.0),
  ('sc-deepak-04', 'match-20260115', 'player-deepak', 12.33, 85.06, 2.0, 11.33, 1.33, 11.33, 1.0),
  ('sc-deepak-05', 'match-20260122', 'player-deepak', 12.33, 85.06, 2.0, 11.33, 1.33, 11.33, 1.0),
  ('sc-deepak-06', 'match-20260129', 'player-deepak', 12.33, 85.06, 2.0, 11.33, 1.33, 11.33, 1.0),

  -- Aaryan Parmar: 8 games, R=92, SR=90.20, OB=16, RC=100, W=6, Econ=12.50, C=-8
  ('sc-aaryan-01', 'match-20251211', 'player-aaryan', 11.50, 90.20, 2.0, 12.50, 0.75, 12.50, -1.0),
  ('sc-aaryan-02', 'match-20251218', 'player-aaryan', 11.50, 90.20, 2.0, 12.50, 0.75, 12.50, -1.0),
  ('sc-aaryan-03', 'match-20260108', 'player-aaryan', 11.50, 90.20, 2.0, 12.50, 0.75, 12.50, -1.0),
  ('sc-aaryan-04', 'match-20260115', 'player-aaryan', 11.50, 90.20, 2.0, 12.50, 0.75, 12.50, -1.0),
  ('sc-aaryan-05', 'match-20260122', 'player-aaryan', 11.50, 90.20, 2.0, 12.50, 0.75, 12.50, -1.0),
  ('sc-aaryan-06', 'match-20260129', 'player-aaryan', 11.50, 90.20, 2.0, 12.50, 0.75, 12.50, -1.0),
  ('sc-aaryan-07', 'match-20260205', 'player-aaryan', 11.50, 90.20, 2.0, 12.50, 0.75, 12.50, -1.0),
  ('sc-aaryan-08', 'match-20260212', 'player-aaryan', 11.50, 90.20, 2.0, 12.50, 0.75, 12.50, -1.0),

  -- Mayank Ghosh: 12 games, R=182, SR=122.15, OB=24, RC=203, W=9, Econ=16.92, C=-21
  ('sc-mayank-01', 'match-20251211', 'player-mayank', 15.17, 122.15, 2.0, 16.92, 0.75, 16.92, -1.75),
  ('sc-mayank-02', 'match-20251218', 'player-mayank', 15.17, 122.15, 2.0, 16.92, 0.75, 16.92, -1.75),
  ('sc-mayank-03', 'match-20260108', 'player-mayank', 15.17, 122.15, 2.0, 16.92, 0.75, 16.92, -1.75),
  ('sc-mayank-04', 'match-20260115', 'player-mayank', 15.17, 122.15, 2.0, 16.92, 0.75, 16.92, -1.75),
  ('sc-mayank-05', 'match-20260122', 'player-mayank', 15.17, 122.15, 2.0, 16.92, 0.75, 16.92, -1.75),
  ('sc-mayank-06', 'match-20260129', 'player-mayank', 15.17, 122.15, 2.0, 16.92, 0.75, 16.92, -1.75),
  ('sc-mayank-07', 'match-20260205', 'player-mayank', 15.17, 122.15, 2.0, 16.92, 0.75, 16.92, -1.75),
  ('sc-mayank-08', 'match-20260212', 'player-mayank', 15.17, 122.15, 2.0, 16.92, 0.75, 16.92, -1.75),
  ('sc-mayank-09', 'match-20260219', 'player-mayank', 15.17, 122.15, 2.0, 16.92, 0.75, 16.92, -1.75),
  ('sc-mayank-10', 'match-20260226', 'player-mayank', 15.17, 122.15, 2.0, 16.92, 0.75, 16.92, -1.75),
  ('sc-mayank-11', 'match-20260305', 'player-mayank', 15.17, 122.15, 2.0, 16.92, 0.75, 16.92, -1.75),
  ('sc-mayank-12', 'match-20260312', 'player-mayank', 15.17, 122.15, 2.0, 16.92, 0.75, 16.92, -1.75),

  -- AJ: 7 games, R=65, SR=72.22, OB=14, RC=128, W=9, Econ=18.29, C=-63
  ('sc-aj-01', 'match-20251211', 'player-aj', 9.29, 72.22, 2.0, 18.29, 1.29, 18.29, -9.0),
  ('sc-aj-02', 'match-20251218', 'player-aj', 9.29, 72.22, 2.0, 18.29, 1.29, 18.29, -9.0),
  ('sc-aj-03', 'match-20260108', 'player-aj', 9.29, 72.22, 2.0, 18.29, 1.29, 18.29, -9.0),
  ('sc-aj-04', 'match-20260115', 'player-aj', 9.29, 72.22, 2.0, 18.29, 1.29, 18.29, -9.0),
  ('sc-aj-05', 'match-20260122', 'player-aj', 9.29, 72.22, 2.0, 18.29, 1.29, 18.29, -9.0),
  ('sc-aj-06', 'match-20260129', 'player-aj', 9.29, 72.22, 2.0, 18.29, 1.29, 18.29, -9.0),
  ('sc-aj-07', 'match-20260205', 'player-aj', 9.29, 72.22, 2.0, 18.29, 1.29, 18.29, -9.0)
ON CONFLICT (id) DO UPDATE SET
  rs   = EXCLUDED.rs,
  sr   = EXCLUDED.sr,
  ob   = EXCLUDED.ob,
  rc   = EXCLUDED.rc,
  wkts = EXCLUDED.wkts,
  econ = EXCLUDED.econ,
  c    = EXCLUDED.c;

-- ── 6. CLEANUP: Remove any test data from earlier sessions ─────────────────
-- Only run this if you want to remove the test match/scorecard created earlier.
-- Uncomment the lines below if needed:
--
-- DELETE FROM scorecards WHERE match_id NOT LIKE 'match-%';
-- DELETE FROM matches WHERE id NOT LIKE 'match-%';
-- DELETE FROM players WHERE id NOT LIKE 'player-%';

-- ── 7. VERIFY ──────────────────────────────────────────────────────────────

SELECT 'Players:    ' || COUNT(*) FROM players;
SELECT 'Seasons:    ' || COUNT(*) FROM seasons;
SELECT 'Opponents:  ' || COUNT(*) FROM opponents;
SELECT 'Matches:    ' || COUNT(*) FROM matches;
SELECT 'Scorecards: ' || COUNT(*) FROM scorecards;
