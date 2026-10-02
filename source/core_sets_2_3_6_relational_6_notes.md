# Source notes — Core Sets 2/3/6 + Relational Data on Azure – 6 (text files)

Four new sets, titles taken from the file names. All built from disk
(No guessing from memory); every answer verified against domain facts.

## Set 2 — file key verified CORRECT for all 60, used as-is

Diffed programmatically: the file's key letters point at the same option
texts as the final JSON for all 60 questions (the single diff is a wording
tightening I made, same meaning). During the build I briefly mis-assigned
16 answers from a misread key; the mistake was caught by the same diff and
every id now points at the domain-correct option.

## Set 3, Set 6 — inline keys fully verified (60/60 each), used as-is

## Relational Data on Azure – 6 — one skip

59 of 60 imported. Original Q31 ("minimal downtime during planned
maintenance" → key says read-scale replicas) has no valid answer among
its options, so it was dropped rather than guessed. All other 59 keep
the file's answers (verified: serverless autoscale, MI compatibility,
TDE/Query Store/auditing on both, Hyperscale 100 TB, etc.).

## Relational Data on Azure – S — separate newer file, also added

"Part 2 Relational Data on Azure – S.txt" is a different file from the
"– 6" one: 60 questions + 60 explanation repeats, inline answers verified
against every stem (VM control, PaaS patching, serverless, elastic pools,
Hyperscale, MI migration, masking, Query Store, temporal, enclaves,
Service Broker unsupported, etc.). Imported 59 as rdas-001..059; its Q33
is the same unverifiable maintenance item skipped in the – 6 set.
The Set 6 repaste matched the disk build, so no action was needed there.
