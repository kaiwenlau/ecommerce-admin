# Day 6 — Thursday 20 August

**Goal:** Make it demo-ready. **No new features.**

If something is unfinished, I hide it or remove it. I do not start it.

## Tasks

- [ ] Click through every screen and write down what is broken
- [ ] Fix the broken things, worst first
- [ ] Check all 4 UI states on every screen once more
- [ ] Check dark mode on every screen
- [ ] Keyboard check: Tab through a form, open a modal, press Esc
- [ ] Run `npx eslint . --fix`
- [ ] Write `README.md`: how to run it, login details, link to the two docs
- [ ] Reset the database and re-seed, so the demo starts clean
- [ ] Fill in any missing rows in the blocker logs above
- [ ] Practise the demo below, out loud, with a timer

## Done when

- [ ] Fresh clone → `docker compose up -d`, `npm i`, `npx prisma migrate deploy`, `npx prisma db seed`, `npm run dev` → it works
- [ ] I have run the demo end to end without getting stuck

## Expected blockers

**Most likely today:** finding a bug big enough to be tempting to fix properly. Do not. There is no
day after this one.

| What might go wrong | How I will know | What to do | Risk |
|---|---|---|---|
| **Fixing turns into building** | It is 3pm and I am writing a new feature "while I am in there" | No new features today. If it is not broken, leave it. If it is broken and big, hide it instead of fixing it | High |
| **Reset wipes the demo data** | The app runs but every list is empty | `prisma migrate reset` drops everything. Always re-seed **after** resetting, and check the counts before stopping | High |
| Fresh clone does not run | The clean-checkout test fails on a missing `.env` or an unbuilt Prisma client | `.env.example` must be copied, and `postinstall` runs `prisma generate`. Test in a **separate folder**, not the one I have been working in | Medium |
| Dark mode breaks one screen | White boxes on a dark page | Nuxt UI handles most of it. Fix by using its colour tokens rather than hard-coded classes | Low |
| Demo runs long | The practice run takes 20 minutes | Cut steps 6 and 7 to one example each. 11 steps is the target, not the floor | Medium |
| Something breaks the night before | A last-minute change breaks a working screen | Stop changing code once the practice run passes. Commit that state and do not touch it | High |

## Blocker log

| What happened | Why it cost time | What I did | Time lost |
|---|---|---|---|
|  |  |  |  |
