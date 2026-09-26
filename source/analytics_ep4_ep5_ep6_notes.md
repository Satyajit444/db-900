# Source notes — Analytics & Visualization (YouTube, Microsoft Learn)

Combined set from 3 videos (all Microsoft Learn, DP-900 series):

1. https://youtu.be/QuQNIWYjV0E — "Analytics workloads in Azure | DP-900 | Episode 4"
   Workloads (large-scale, real-time, visualization), ingest→process→store→
   analyze at scale, Microsoft Fabric, Azure Databricks, Power BI.
2. https://youtu.be/5zbCjFFXLC0 — "Explore streaming and real-time analytics | DP-900 | Episode 5"
   Streaming fundamentals, batch vs stream, Azure + Fabric live pipelines,
   event streams, KQL databases, Spark, Power BI for real-time decisions.
3. https://youtu.be/uG69dAmpANA — "Explore data visualization | DP-900 | Episode 6"
   Fabric + Power BI reports/dashboards, measures, dimensions, hierarchies,
   visuals.

## Retrieval attempts

oEmbed + watch-page metadata + descriptions fetched and verified for all 3.
Timedtext transcripts and the youtubei player API refused from this network
(same restriction as Episode 3), so the bank + notes were authored from the
verified per-episode outlines + DP-900 analytics objectives.

## Bank design (data/analytics-visualization.json)

- 56 questions, ids anv-001…anv-056, 4 options, explanations,
  easy 21 / medium 23 / hard 12.
- Subtopics: Workloads 12, Fabric & Databricks 6, Streaming 12,
  Power BI 12, Scenarios 14.
- Per-question `source` cites the exact episode URL it belongs to.
- Correct positions rotated to a balanced spread (engine shuffles anyway).

## Notes (notes/analytics-visualization.json)

- Consolidated guide with terminology folded into concept cards plus two
  "Commonly confused" comparison tables (streaming trio; measure/dimension/
  hierarchy). Same reusable renderer — no engine changes.
