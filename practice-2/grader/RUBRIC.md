# RelayDesk Practice 2 — Grading Rubric

Score out of 100. Grade evidence and engineering judgment, not keyword matching. A candidate can score well without fixing every intended finding when they prioritize well, diagnose root causes, and deliver a smaller number of safe, verified changes.

## Diagnostic depth — 25

- 22–25: Traces multiple end-to-end flows, identifies root causes and broken assumptions, quantifies scale/concurrency behavior, and distinguishes confirmed findings from concerns.
- 16–21: Finds several root causes with good file-level evidence; some impact or edge-case analysis is incomplete.
- 8–15: Mostly symptoms, shallow file-local observations, or weak prioritization.
- 0–7: Unsupported claims, major misunderstandings, or little meaningful diagnosis.

Suggested finding coverage within this category: up to 5 points per intended finding, adjusted for depth rather than mere mention.

## Solution quality / minimality — 20

- 17–20: Targeted fixes address the actual invariant at the correct layer and avoid unrelated refactoring.
- 12–16: Mostly correct fixes with manageable gaps or one overly broad change.
- 6–11: Symptom fixes, incomplete invariants, or substantial unnecessary churn.
- 0–5: Fixes are unsafe, ineffective, or absent without a strong documented reason.

Full marks do not require five implementations. Two or three excellent high-priority fixes can outperform five superficial patches.

## Backwards compatibility — 15

- 13–15: Explicitly identifies affected clients/data/operations and proposes safe staged migrations or dual-read/write behavior.
- 9–12: Preserves current contracts and notes key migration needs, with minor omissions.
- 4–8: Generic compatibility statements without concrete rollout reasoning.
- 0–3: Breaks clients or stored data, blindly deletes legacy behavior, or ignores migration risk.

## Verification / testing — 15

- 13–15: Adds focused regression tests for denied access, scale/query bounds, failure injection, concurrency/idempotency, and/or CI selection as appropriate; all checks pass.
- 9–12: Good tests for implemented changes and clear manual verification for unresolved work.
- 4–8: Happy-path-only coverage or assertions that do not prove the claimed invariant.
- 0–3: Broken baseline, no credible verification, or tests changed merely to accept regressions.

## Documentation — 10

- 9–10: `ASSESSMENT.md` is concise, evidence-backed, prioritized, and candid about unresolved work and trade-offs.
- 6–8: Clear findings and solutions but uneven evidence or impact detail.
- 3–5: Vague, repetitive, or AI-styled claims unsupported by code references/tests.
- 0–2: Missing or materially misleading documentation.

## Systems thinking — 10

- 9–10: Connects trust boundaries, database behavior, external delivery guarantees, operational rollout, and CI reality; prioritizes by production risk.
- 6–8: Strong multi-layer reasoning with a few missed interactions.
- 3–5: Primarily local code reasoning.
- 0–2: Treats the exercise as isolated style cleanup or feature work.

## Atomic Git history — 5

- 5: Small coherent commits with neutral, accurate messages; documentation/tests travel with related changes.
- 3–4: Generally understandable history with minor mixing.
- 1–2: Large mixed commits or unclear messages.
- 0: No candidate commits, broken history, or unrelated/destructive rewrites.

## Penalties and calibration

Apply within the categories above rather than double-deducting unless damage is independent:

- False positives stated with high confidence and no evidence.
- Broad unrelated refactors that increase review/migration risk.
- Fixing symptoms rather than the invariant/root cause.
- Breaking visible behavior or tests without justified migration handling.
- Changing API contracts without rollout reasoning.
- Deleting backwards-compatible behavior blindly.
- Claims of testing, security, or performance unsupported by commands, measurements, or assertions.
- Mixing unrelated fixes in one commit.

Password hashing may be credited as a carefully scoped secondary observation, but it is not one of the five intended major findings and should not receive the same diagnostic coverage credit. Conversely, accept alternative findings when the candidate demonstrates comparable production severity with concrete execution-path evidence; do not reward speculative style preferences.
