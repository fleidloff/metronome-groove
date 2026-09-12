---
name: implement-vibe-with-docs
description: Build a change that `/vibe-with-docs` has specced in `specs/N-title/` — write the contracts, run its tracks in waves (or build it in the lead when there is one), gate it with the `verifier` against `spec.md`'s `## Done when` bullets, then turn what is worth keeping into ADRs and docs changes, mark the row done in `specs/features.md`, and hand the folder back for a last check. Never deletes a spec folder. Refuses a folder with no `tech-spec.md` or with anything still open. Use whenever the user runs `/implement-vibe-with-docs`, or asks to build, implement or ship a vibed change.
argument-hint: [N]
---

# Vibe with docs — implement

The building half. `/vibe-with-docs N` settled what changes and how; this skill
turns that into a diff, and then puts what is worth keeping where it will be
read again.

**The last part is the point.** The spec folder stays — this door deletes
nothing — but a decision that lives only inside it is a decision nobody opens
twice. §8 moves what binds future work into an ADR and into `docs/`; §9 marks
the change done and hands it to you. A run that builds the code and stops there
has done the cheap half.

## 0. Never commit

No `git add`, no `git commit`, no branch, no stash. Everything this run changes
stays in the working tree for the user to read and commit themselves.

**And no `rm`.** The spec folder is not scratch; §9 says what happens to it
instead.

## 1. Resolve the folder

- `/implement-vibe-with-docs 4` → `specs/4-*/`.
- Bare → list `specs/` with each folder's phase and ask which. Don't guess
  at the most recent one.
- No such folder → say so and point at `/vibe-with-docs`.

## 2. Refuse unless it was specced

Three gates, in this order. Each stops the run — say which failed and what to
run, and change nothing.

| Folder state | What it means | Say |
| :-- | :-- | :-- |
| no `tech-spec.md` | the implementation was never talked through | run `/vibe-with-docs N` |
| `spec.md` has bullets under `## Open` | specced, not settled | name each one, then run `/vibe-with-docs N` |
| `## Done when` is empty or missing | there is nothing to grade against | run `/vibe-with-docs N` |

**Don't answer an open question yourself**, and don't build the option you would
have picked. An `## Open` bullet built anyway is a decision nobody made,
arriving as a diff.

A bullet under `## Open` that names what it is waiting on and says it is
*deliberately* parked out of scope is settled, not open. The test is whether the
build needs it.

## 3. Re-run the size test

`/vibe-with-docs` §7's four questions, now against the files you actually open.
The tech spec was written from a reading; the code is the thing.

**Escalating mid-build is allowed and expected.** If the third file tells you
this is bigger than the spec says, stop, write what you found into `spec.md`
under `## Decided`, leave the tree as it is, and say so. Ask before continuing —
a waiver is the user's to give, and it goes in `spec.md` in their words.

## 4. Plan the schedule

`tech-spec.md` declares epics, tracks, roles and waves (`/vibe-with-docs` §6).
Read them and build the list of **units** — a unit is the smallest chunk one
agent can own end to end: a track, or a whole epic when it is small.

**Contracts go first, in the lead.** If `tech-spec.md` has a `## Contracts`
section, write those types and signatures before dispatching anything. Every
worker then builds against a real file instead of a description, which removes
most of the coordination cost.

**The scheduling rule is file ownership.** Two agents writing one file is a lost
edit, not parallelism. Take the `Owns` list from each track; where two overlap,
merge the units or put them in different waves. If the overlap is unavoidable,
merge them — a worktree split would need commits to merge back (§0), so that is
the user's call, not yours.

**One track means build it in the lead.** A single-track spec is the common
case for this door, and dispatching one agent for it buys nothing: it throws
away the reading §3 just made you do and pays to have it done again. Follow the
steps yourself, red then green.

**Two or more tracks means dispatch them**, one agent per unit in the current
wave, in a single message so they run concurrently. Aim for 3–5 concurrent
workers; past that, coordination costs more than it buys.

Write nothing to `specs/features.md` yet — this door writes its row once, at the
end (§8c).

## 5. Dispatch by the role the track declares

**Read each unit's `Role` field and dispatch that agent type.** The role was
decided in the conversation, where the reasoning was — do not infer it from the
files the unit owns. Give each worker a brief naming the files to read
(`spec.md`, `tech-spec.md`), the files it owns, its steps, the test command and
its definition of done. Workers start with no knowledge of the conversation, so
anything only said in chat and not written into the two documents does not reach
them — which is `/vibe-with-docs` §5's rule doing its job.

**When a track declares no role**, fall back to `implementer`, except for a
track whose work is a musical or timing decision, which takes the
musician-then-implementer pair below. Say in the report where you had to fall
back.

### A musical unit takes two turns

A unit that decides what the app sounds like or how it keeps time is the one
exception to one agent per unit:

1. **The `musician` runs first.** It decides the parameters and states the
   reasoning, and writes no code.
2. **The lead passes that reasoning to an `implementer`**, which makes the
   change.

It stays one unit and occupies two turns; the other units in the wave run
alongside both. Worth the dispatch even on a single-track spec, because
`docs/music.md` is deliberately not loaded into a normal session, so the musical
judgement is exactly what a session that has not read it gets wrong.

### The roles this door does not use

**Not `architect`.** `tech-spec.md` is the spec, written in the conversation
with the user. If a change needs a second spec written by an agent, it needed
splitting, not a second planner.

**Not `test-writer` and `implementer` on a single-track spec** — the lead writes
both the test and the code there (§4). On a multi-track spec they are the normal
dispatch.

**`sam` is available throughout**, for a question the build turns up that only
the user of the app can settle. Its answer goes into `spec.md` under
`## Decided` before the code that depends on it.

**`verifier` is the gate in §7**, whatever the track count. It buys the one
thing the lead cannot have: a reader that grades but cannot fix. You wrote or
merged the code, which makes you the worst judge of whether it meets the spec.

## 6. Build it

Follow `tech-spec.md`'s steps in order, red then green — in the lead, or in the
workers, per §4 and §5. `docs/testing.md` applies unchanged: every `## Done when`
bullet a test can settle gets one, and the tests go where that document says.
Run them as you go — §7 is the gate, not the loop.

Build what the spec says, under what `## Decided` decided. A better idea that
turns up mid-build is a note in the report or a second folder, not a silent
substitution: the user read that spec, and the diff should be the thing they
read.

**Between waves, run the suite in the lead** before starting the next one.
Parallel work amplifies whatever is already broken, and a wave that starts on a
red tree hands every worker someone else's failure.

## 7. Checks — the verifier is the gate

Dispatch the **`verifier`** with `spec.md`'s path and the file scope: what
`tech-spec.md` named, plus anything the build actually changed. It runs

```bash
npm run lint && npm test && npm run build
```

and grades each `## Done when` bullet done / partly / not done. Its rows are
labelled `D1`…`Dn` in the order `spec.md` writes the bullets.

**Check the citations before relaying anything.** For every row graded **done**,
open the file it names and confirm a test with that name exists. A citation that
does not resolve is a failure of the report, not a passing grade: name the
bullet, the file and the test it cited, and send it back to re-cite or re-grade.

Then fix until it comes back clean:

1. **Fail** → fix in the lead and verify again.
2. **Pass with gaps** → green, but a bullet is uncovered. Write the missing test
   and verify again. The exception is a bullet only a person can settle — a look
   at the page, an ear — which stays **partly** with the reason said out loud.
3. **Pass** → done.

Show what failed. Never report a green run you did not execute, and never weaken
or delete a test to get one. **If the same failure survives three rounds, stop
and report it** rather than looping.

## 8. Turn the decisions into the permanent record

The spec folder stays, so this section is no longer a rescue before a deletion.
It is still not optional, and the reason has only changed shape: a decision that
lives **only** in `specs/<N>-<title>/` is a decision nobody reads again. The
folder is the record of how this change was designed; an ADR is what binds work
that has not happened yet, and `docs/` is what loads into every session.

Do all three, and say in the report what each one came to — including
"nothing".

### 8a. ADRs

Read `spec.md`'s `## Decided` and `tech-spec.md`'s `## Contracts` and
`## Risks`, and ask of each entry: **would reversing this cost real rework, and
does it constrain work that has not happened yet?** Every yes becomes a record
in `docs/adr/`: copy `0000-template.md`, take the next four-digit number, write
it, and add a row to `docs/adr/adrs.md` — creating that index with the first
ADR, as a table of number, title, status and date.

- A decision that supersedes an existing ADR says which number it replaces, and
  the old one is edited to ⛔ **Superseded by** — never deleted.
- A parameter chosen inside a rule an ADR already states is not a new ADR.
- Most changes produce none, and "no ADR-worthy decision in this one" is a
  normal outcome. Say it rather than inventing one.

### 8b. The documents under `docs/`

Anything the change made untrue is now a lie in a document that loads into every
session. Check each against the diff and update what moved:

| If the change touched… | Re-read |
| :-- | :-- |
| an import boundary, a module's files, a folder's door | `docs/architecture.md` — the map describes the tree, and a drifted map is worse than none |
| a rule a linter or structure test now enforces | `docs/coding-guidelines.md` |
| where tests go, or what must be tested | `docs/testing.md` |
| what the app sounds like, or how it keeps time | `docs/music.md` |
| what the user sees or is told | `docs/persona.md`, if it changes what Sam would say |

### 8c. The archive row

Move this change into the **Implemented** table in
[specs/features.md](../../../specs/features.md), and strike it from
**Candidates** if it was sitting there:

```markdown
| <N> | <Title> | <YYYY-MM-DD> | <what shipped, in one or two sentences, and any ADR it produced> |
```

The folder survives, so this row is a pointer rather than the last copy — but it
is the only place a reader sees every change in one list. Write it for someone
scanning the table cold, and name the ADR numbers it produced.

**While the change is still in flight the row reads 🚧 in the Shipped column.**
It becomes a date in §9, and not before.

## 9. Mark it done, then hand it back

**Never delete the spec folder.** Not at the end of a clean run, not when it
looks spent, not to tidy the tree. It is the record.

Two things happen here, in order:

1. **Mark the row done** — the date in `specs/features.md`, replacing 🚧. It
   goes in only when the verifier came back **pass** and every `## Done when`
   bullet holds. Anything short of that leaves the 🚧, and you say what is
   standing in the way rather than rounding it up.
2. **Ask for the last check.** Tell the user the change is done and hand them
   the folder path, the diff and the `## Done when` table. Then stop. Whether
   the folder is archived, trimmed or left exactly as it is, is theirs to
   decide — and if they ask you to remove it, that is a separate instruction on
   a separate turn.

A run that ends by asking is a run that ended correctly. Do not treat silence
as approval and do not carry on into anything else.

## 10. Report

The folder and number; the size test's verdict against the real files; the files
changed, one line each; the verifier's verdict and the check results; each
`## Done when` bullet and what settles it; the ADRs written; the documents
updated; the archive row and whether it reads a date or 🚧; and the spec folder's
path, kept. Then: the diff is uncommitted in the working tree, and the last
check in §9 is what you are waiting on.
