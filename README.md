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

`topics.json`:

```json
[
  {
    "id": "core-data-concepts",
    "name": "Core Data Concepts",
    "description": "…",
    "file": "data/core-data-concepts.json"
  }
]
```

## Add a new `.py` file (workflow)

```text
READ FILE → UNDERSTAND TOPIC → EXTRACT QUESTIONS → GENERATE MORE IF NEEDED
→ NORMALIZE JSON → CREATE/UPDATE data/<topic>.json → UPDATE data/topics.json
→ VALIDATE → TEST UI → COMMIT → PUSH (Pages redeploys automatically)
```

Rules:

- Merge into the existing topic file when the topic matches (e.g. `core_data_concepts_2.py` → `core-data-concepts.json`), new IDs only (`cdc-051…`), never reuse IDs.
- Deduplicate exact + semantic duplicates; keep the stronger version.
- Every question needs 4+ options, a valid `correctAnswer` index, explanation, difficulty, topic, source.
- Validate JSON before commit. Quick check: `python -m json.tool data/core-data-concepts.json > /dev/null`.

## Current content

- **Topic added:** Core Data Concepts
- **Questions added:** 50 (`cdc-001`–`cdc-050`, from `dp900.py`)
- **Distribution:** easy 24 · medium 14 · scenario 10 · hard 2
- **Subtopics:** Workloads 16 · Data Types 10 · Roles 9 · Azure Services 8 · File Formats 4 · Databases 3
- **Session length:** 15 random per attempt
