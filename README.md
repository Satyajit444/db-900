# DP-900 Practice Center

Static, GitHub Pages-compatible **Azure Data Fundamentals (DP-900)** practice quiz.

- Only `HTML + CSS + Vanilla JS + JSON` — no backend, no database, no build step.
- Quiz engine is **data-driven**: adding a topic = new `data/*.json` + one entry in `data/topics.json`.
- Each attempt: **15 random questions**, shuffled questions + shuffled options (answer key preserved), instant ✓/✗ feedback, explanations, Previous/Next, results + review, retry, question bank, `localStorage` best scores.

## Live structure

```text
dp900-quiz/
├── index.html
├── style.css
├── app.js
├── data/
│   ├── topics.json
│   └── core-data-concepts.json   # 50 questions, IDs cdc-001…cdc-050
├── source/
│   └── core_data_concepts.py     # source material (NOT used by the site)
├── assets/
└── README.md
```

## Run locally

Browsers block `fetch()` of JSON over `file://`. Serve the folder:

```bash
cd DP-900
python -m http.server 8000
# open http://localhost:8000
```

## Deploy to GitHub Pages

1. Push this folder to a repo (root or `docs/`).
2. Repo → Settings → Pages → Deploy from branch → `main` + `/ (root)`.
3. Open the Pages URL — no server config needed. All paths are relative (`./data/...`, `./style.css`, `./app.js`).
4. Included `.nojekyll` ensures `data/` JSON is served as-is.

## Question JSON contract

Every question:

```json
{
  "id": "cdc-001",
  "question": "...",
  "options": ["A", "B", "C", "D"],
  "correctAnswer": 0,
  "explanation": "Why the answer is correct…",
  "difficulty": "easy | medium | hard | scenario",
  "topic": "Core Data Concepts",
  "subtopic": "Workloads",
  "source": "dp900.py"
}
```

`topics.json` (one entry per source — newest first on the landing page):

```json
[
  {
    "id": "core-data-concepts",
    "title": "Core Data Concepts",
    "description": "…",
    "sourceType": "py",
    "sourceName": "core_data_concepts.py",
    "createdAt": "2026-09-19",
    "questionFile": "data/core-data-concepts.json",
    "questionCount": 50
  }
]
```

`questionCount` is stored for visibility but the UI always shows the live
count loaded from the JSON file. Random Practice pools all sets dynamically
at runtime — no random-question JSON file is ever created.

## Add a new `.py` file (workflow)

```text
READ FILE → UNDERSTAND TOPIC → EXTRACT QUESTIONS → GENERATE MORE IF NEEDED
→ NORMALIZE JSON → CREATE/UPDATE data/<topic>.json → UPDATE data/topics.json
→ VALIDATE → TEST UI → COMMIT → PUSH (Pages redeploys automatically)
```

Rules:

- Every new source becomes its OWN set + card. Never merge into an existing
  set unless explicitly told to ("merge with X").
- New IDs only per set, never reuse IDs.
- Deduplicate exact + semantic duplicates; keep the stronger version.
- Every question needs 4+ options, a valid `correctAnswer` index, explanation, difficulty, topic, source.
- Validate JSON before commit. Quick check: `python -m json.tool data/core-data-concepts.json > /dev/null`.

## Current content

- **Sets (newest first):** Snigdha Questions (11, `snig-001`–`snig-011`, ExamTopics DP-900) · Analytics & Visualization (56, `anv-001`–`anv-056`, YouTube Eps 4–6) · Non-Relational Data in Azure (56, `nrel-001`–`nrel-056`, YouTube Episode 3) · Relational Data (100, `rel-001`–`rel-100`, PDF Episode 2) · Core Data Concepts (50, `cdc-001`–`cdc-050`, `dp900.py`)
- **Total questions:** 273 normal + 40 Challenge Mode (independent count, excluded from Random Practice and totals)
- **Analytics distribution:** easy 21 · medium 23 · hard 12
- **Non-relational distribution:** easy 16 · medium 23 · hard 17
- **Relational distribution:** easy 41 · medium 46 · scenario 12 · hard 1
- **Random Practice:** pools all sets live (15 / 30 / 50 per attempt, reshuffled) with a topic-scope dropdown (All topics by default); unseen-first with repeats capped at 10% via `localStorage` history
- **Session length:** 15 random per single-set attempt
