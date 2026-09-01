# Private Scoring Rubric (100 points)

Score evidence demonstrated in `ASSESSMENT.md`, code, tests, and Git history. A correct diagnosis may earn substantial credit even when time prevents implementation. Do not award credit for naming a symptom without tracing its cause and impact.

## Diagnostic depth — 25

- 5 points per major finding.
- Full credit requires the exact root cause, affected execution/data flow, and realistic impact.
- Give 2–3 points for a materially correct but incomplete diagnosis; 1 for only recognizing a symptom.

## Solution quality and minimality — 20

- 4 points per finding addressed.
- Favor fixes that close the complete failure mode with a small, maintainable change.
- Deduct for broad rewrites, new failure modes, process-local concurrency guards, or cosmetic mitigations.

## Backwards compatibility — 15

- 6 points for handling the legacy identity-header migration safely.
- 5 points for preserving board response semantics or providing a compatible pagination transition.
- 4 points for preserving membership/edit and invite retry behavior.

## Verification and testing — 15

- 3 points per finding for focused verification that would fail before and pass after.
- Reward concurrency/interleaving and query-count tests where applicable, not only happy paths.
- Existing tests and type checking must still pass for full credit.

## Documentation — 10

- Findings are prioritized by severity and exploitability/impact.
- `ASSESSMENT.md` clearly separates observed evidence, assumptions, changes, and unresolved work.
- Verification commands and relevant trade-offs are recorded.

## Systems thinking — 10

- Connects client/server trust, API/resource/database authorization, synchronous DB scale, retry/concurrency semantics, and request-scoped observability.
- Identifies migration and operational rollout needs rather than treating code changes as the entire solution.

## Atomic Git history — 5

- Commits are reviewable, focused, and independently coherent.
- Messages explain intent; unrelated fixes are not bundled.

## Suggested interpretation

- 90–100: Exceptional production judgment and execution.
- 75–89: Strong assessment with sound prioritization and fixes.
- 60–74: Good fundamentals; some gaps in depth, compatibility, or verification.
- 40–59: Partial diagnosis with notable correctness or systems gaps.
- Below 40: Primarily surface-level changes or insufficient evidence.
