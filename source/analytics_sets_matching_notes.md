# Source notes — Analytics Sets 2/3/5 + Matching sets (text files)

Six files processed; Matching.txt and Matchingg.txt are byte-identical,
so the core matching set was built once. Unrequested disk files left for
later: Part 3 set-4/set-5, Part 4 set-4, Part 4 -matching, Part 3 base.

## Analytics Sets 2/3/5 — inline keys verified, used as-is (60 each)

All 180 inline answers checked against stems (Synapse, Factory, Stream,
Databricks, Power BI, ADLS, Purview, Monitor). Zero exact-stem duplicates
within/across the three files and vs the existing analytics bank.

## Core Data – Matching (40: 35 individuals + 5 combined mappings)

Groups with 4 options became individual questions; smaller banks
(processing, normal forms, consistency, 3 Vs, processing traits) became
one combined-mapping question each using only shown terms.

## Analytics – Matching (16: 5 individuals + 11 combined mappings)

Group 6 scenarios became individuals; everything else combined mappings.
The dashboard item (Q-group-1 item 5) has no valid answer among its options
(Power BI would be correct) and was excluded, noted in the combined
question's explanation.

## Matching architecture

matching/*.json holds the banks; topics.json entries carry "matching": true
and render in a dedicated Matching Practice section with identical cards.
Same engine, same shuffle/feedback/results/review, included in Random pools.
