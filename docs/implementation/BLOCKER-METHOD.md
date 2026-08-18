# How the blocker sections work

Every day has two, and they are a matched pair.

| Section | Written | Answers |
|---|---|---|
| **Expected blockers** | **Before** starting the day | "What could go wrong, and how will I spot it early?" |
| **Blocker log** | **After** it happens | "What actually went wrong, and what did I do?" |

The **"How I will know"** column is the important one. A fix is only useful if I recognise the problem, and most time is lost *before* realising which problem I have — not after.

At the end of each day, mark the predictions ✅ or ❌ ([Day 1](./IMP-DAY1.md) shows the format). The gap between the two lists is the interesting part:

- **Predicted and it happened** — the prep worked, and the fix was already written down.
- **Predicted and it did not** — fine. Cheap insurance.
- **Not predicted** — the one to look at. On Day 1 both misses were *environment* problems (Docker not running, VS Code's formatter), not *library* problems. I had been thinking about the code and not about the machine around it.

## How to write the logs

Show how I think, not make excuses. Each row says the **cause** and the **decision**, not just that something was hard.

**Weak:** "Prisma was confusing, lost 2 hours."

**Strong:** "Prisma 7 removed the built-in engine, so every guide I found was for v6 and did not work. Found it in the v7 docs — it needs the `@prisma/adapter-pg` driver. Lost 1 hour. Now noted in `DECISIONS.md` so nobody repeats it."

The second tells them I found the real cause, fixed it, and wrote it down. That is the thing being tested.
