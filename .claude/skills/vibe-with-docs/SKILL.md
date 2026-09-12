---
name: vibe-with-docs
description: Design a feature in chat, one question at a time, and write the answers down as you go — allocates `specs/N-title/`, fills `spec.md` with what the change is and what done means, then `tech-spec.md` with how it gets built. Every question arrives as options with exactly one recommended, and the persona's verdict quoted where it bears. Asks in the conversation rather than in the document, and keeps asking until it is 90% confident. Writes no code; `/implement-vibe-with-docs N` builds it. Use whenever the user runs `/vibe-with-docs`, or asks to think a feature through in chat, design something conversationally, or spec a change before building it.
argument-hint: [what to build]
---

# Vibe with docs

Design a change in the conversation and write the answers down as they land.

**The trade is deliberate.** Talking buys speed and follow-ups — a question
whose answer opens two more gets both asked in the same minute instead of the
next session. What this skill refuses to trade away is the writing down:
**every answer goes into the file before the next question is asked.** A
conversation nobody wrote down is the thing this door is not.

## 0. No code, and never commit

No `git add`, no `git commit`, no branch, no stash. And **no source edits** — not
a test, not a one-line fix, not a spike. This skill writes exactly two files,
both under `specs/N-title/`. Reading the tree is the job; writing to it is
not.

`/implement-vibe-with-docs N` builds it, and is the only thing that does.

## 1. Start in the conversation, immediately

No interview ceremony, no "shall I begin". Take whatever the user gave —
`/vibe-with-docs a practice timer`, or a bare `/vibe-with-docs` — and:

1. Allocate the folder (§2).
2. Write what you already know into `spec.md`.
3. Ask the first question.

A bare invocation with no subject is the one case where you ask before writing:
"what are we building?", then allocate.

**One question per message. Never a list.** A batch asks the user to hold four
threads at once, and the second answer usually changes the third question.

## 2. Allocate the folder

```
specs/<N>-<kebab-title>/
├── spec.md        § 3 — what changes, and what done means
└── tech-spec.md   § 6 — how it gets built
```

`N` is one higher than the largest number in **either** the folders under
`specs/` or the two tables in [specs/features.md](../../../specs/features.md).
Take it from both — numbers are never reused, and a candidate promoted from the
second table gets its number here, not there.

**The folder stays.** It is committed like any other source, it survives the
change shipping, and nothing in this door deletes it: `/implement-vibe-with-docs`
§8 turns what is worth keeping into an ADR and a docs change, §9 marks the row
in `specs/features.md` **done**, and §10 hands the folder back to you for a last
look. Removing it afterwards is your call and yours alone.

That is what lets these two files be written for a reader in six months rather
than for the build that is about to consume them.

## 3. `spec.md` — what we are building

Create it on the first turn, with whatever the user's opening line already
settles. It grows through the conversation; it is never written all at once at
the end.

```markdown
# V<N>. <Title>

Started <YYYY-MM-DD> · `/vibe-with-docs`
**Phase:** spec | tech spec | ready to build — `/implement-vibe-with-docs <N>`

## What

* one idea per bullet, in the user's own words where they said it

## Done when

* one bullet per thing that has to be true, each one testable or explicitly
  marked as needing an ear or a look

## Decided

* **<the question>** — <the answer>, because <the reason they gave>

## Open

* <anything parked deliberately, and what it is waiting on>
```

**`## Decided` is the load-bearing section.** Write the answer *and* the reason:
a decision without its reason is the thing nobody can revisit six weeks later.

## 4. The question loop

Keep asking until you are **90% confident you could build the right thing
without guessing**. That is the bar — not "the user seems done", not "there is
enough to start".

After every answer:

1. Write it into `spec.md` — `## What`, `## Done when` or `## Decided`,
   whichever it belongs in.
2. Ask the next question, or say the spec is settled and move to §6.

**What is worth a question:**

- two readings of the ask that would produce different work
- a `## Done when` bullet you cannot write because you do not know what done is
- a scope edge — is *this* in or out
- a decision the user would want to make themselves: what the user sees, what
  the app says, what happens in the unhappy case

**What is not:**

- anything the tree answers. Read the file.
- anything `docs/architecture.md`, `docs/coding-guidelines.md`,
  `docs/testing.md` or an ADR under `docs/adr/` already decides — those are
  settled, and re-asking them invites an answer that contradicts a record.
- implementation. It has its own phase, and asking early anchors the design to
  the first shape you thought of.

### How to ask: options, one of them recommended

**Every question comes as options.** Two to four of them, each a decision the
user could take, each with the consequence of taking it. Never an open prompt —
"how should this work?" hands the work back.

**Exactly one option is marked `(recommended)`, with the reason in the same
breath.** You have read the tree and they have not; withholding the view makes
them do that reading. Recommend the option you would build, not the safest one.

**Every option is a real decision — don't spend one on "let's discuss it".**
The harness already offers the user a free-text way out of any question, so an
options list that includes one is spending a slot on something they have
anyway. Give two to four answers and let them talk instead of picking if they
want to; when they do, drop the options and have the conversation, and the
outcome still goes in `## Decided`.

Ask with `AskUserQuestion` when the options are short enough to fit its labels,
and in prose when an option needs a paragraph to be fair to it.

### Include the persona's opinion when the question is the user's

**Dispatch `sam` before asking, whenever the answer turns on what the person
using this would do** — what they would want, what would lose them, what they
would not understand.

Then put its verdict *in the options*, so the user is choosing with it in front
of them rather than after the fact:

- the option Sam favours says so, in its own line.
- quote it rather than paraphrasing. The value is that a product call is made
  in the user's voice, and a summary is your voice again.
- **Sam's verdict is an input, not the recommendation.** Where you disagree,
  recommend your option and say Sam's view under the other one — the user
  should see the disagreement, not a resolved version of it.
- if it comes back "no persona bearing", the question was the code's. Ask it
  without a persona line and don't dispatch it again for that thread.

Don't dispatch it for anything the code decides — where a file goes, what a
type is called, whether a test is worth writing.

**Whatever the answer, `## Decided` records the reason the user gave**, not the
option number. "B" is not a reason, and six weeks later the number means
nothing.

## 5. Stopping is safe, and it is the normal case

**The user may stop after any answer, and the work must survive it.** This door
is asynchronous by design: a change can be defined over a week, a few questions
at a time, in different sessions.

What that requires of you:

- **Nothing lives only in the conversation.** An answer you are holding in your
  head to write down "once the section is finished" is an answer that is lost if
  the user closes the tab. Write it, then ask.
- **Keep `**Phase:**` current** — the line at the top of `spec.md` is how a
  later session knows whether it is still shaping the product or already on the
  code. Change it when the phase changes, not at the end.
- **Write the question you are about to ask, with its options.** Before asking,
  the thing still open goes under `## Open` — the question, the two to four
  options, and which one you recommended and why. If the answer arrives, move
  it to `## Decided`; if the user stops, the next session picks the question up
  with the same options rather than re-deriving them and landing on different
  ones.
- **No summary is owed at the end of a session.** `spec.md` is the summary. If
  the user stops mid-flight, say the folder path and what the next question was,
  in a line.

And the reason the build is a second skill: **the user decides when
implementation starts.** Never roll into it because the spec looks finished, and
never write code "to check the shape" — §0 means it.

## 6. `tech-spec.md` — how it gets built

Only once `spec.md` is settled, and say so before you start: the phase change is
the user's cue that the subject just moved from the product to the code.

Same loop, same rule — one question at a time, every answer written down before
the next one. Set `**Phase:**` to `tech spec`.

```markdown
# V<N>. <Title> — tech spec

## Contracts

* the types, signatures and storage keys the change adds or widens, written out
  in full — these are frozen, and every track builds against them

## Epics

One heading per epic when the change splits, otherwise one epic called the
change itself.

### Epic 1 — <name>

#### Track A — <name>

* **Role:** `test-writer` | `implementer` | `architect` | `musician`
* **Owns:** the files this track writes, and nothing another track writes
* **Needs to start:** a contract, or another track — name it

1. **red** — the test, and what it asserts
2. **green** — the smallest change that passes it
3. …

## Waves

* **Wave 1 (parallel):** Track A, Track B
* **Wave 2:** Track C — needs A's <thing>

## Checks

* `npm run lint`, `npm test`, `npm run build`

## Risks

* what could break, and what holds it
```

### Design it to run in parallel

- **Freeze the contracts first.** Work serialises because Track B needs
  something Track A has not built. Usually B needs only the *shape* — a type, a
  signature, a key. Write those out up front and both tracks build against them.
- **Tracks own disjoint files.** Two tracks writing one file is a merge
  conflict, not parallelism. List what each one owns, and where two overlap,
  merge them or put them in different waves.
- **Every track declares a role**, chosen by what its work *is*: a track whose
  product is tests takes `test-writer`, one writing code behind a frozen
  contract `implementer`, one deciding shape or decomposition `architect`, and
  **any track whose work is a musical or timing decision takes `musician`** —
  what the click sounds like, how a subdivision is felt, what a tempo range
  means. `/implement-vibe-with-docs` reads this field to decide what to
  dispatch, so a track without one leaves it guessing.
- **State real dependencies only.** Ask what a track needs to *start* versus to
  *finish*. Most answers are a contract, and the contract already exists.
- **Every track ends verifiable on its own**, then an integration step joins
  them.

### Split into epics when it splits, and not otherwise

An epic here is a slice that ships something on its own and can be verified on
its own. Split when the change has two of those; keep one epic when it has one.

**Don't invent a split.** Two tracks that cannot name disjoint files are one
track, and one track in one epic is a perfectly good tech spec — it is what a
two-file change looks like. An invented second track costs a dispatch, a brief
and a merge to buy nothing.

**Ask the user before splitting**, in one question, when it is a real fork —
in §4's shape, options with one recommended: one epic, or two named epics with
what each one ships on its own. The answer goes in `## Decided`. This is a
question about build order rather than about the user, so it usually carries no
persona line.

### What to ask, and what to read

**Read before you ask.** A question the tree answers — which file holds this,
what that hook returns, whether a helper exists — is a question you should have
searched. Ask about forks the code cannot settle: where a boundary should fall,
whether a folder gets a door, what a test should pin, whether the split is worth
it.

**§4's shape holds here too**: two to four options, exactly one recommended with
its reason. What changes is the persona line — an implementation fork rarely has
one, and a question that does was a `spec.md` question that arrived late.

**Name the concern folder for every file**, per
[docs/architecture.md](../../../docs/architecture.md) and
[docs/coding-guidelines.md](../../../docs/coding-guidelines.md). Touching more
than three is the signal that this change wants splitting, and saying so is §7.

**Before writing a step that changes what the app sounds like or how it keeps
time, read [docs/music.md](../../../docs/music.md)** — and if the change touches
anything that document marks as fixed, stop and say what it would break.
Dispatch `musician` for the musical decisions; it decides and writes no code.

## 7. When it is too big for one pass

Four questions against the files `tech-spec.md` names:

1. Is `## Done when` five bullets or fewer?
2. Does it touch at most two or three of the app's concern folders?
3. Does it leave everything `docs/music.md` marks as fixed alone?
4. Would one `git revert` roll it back?

Failing them is a **suggestion**, not a gate. Say which question failed and what
it costs, once. The move is to split it into two vibed changes that each ship
something, not to build it more carefully. A waiver goes in `spec.md` under
`## Decided`, in the user's words.

**Size is not the same question as parallelism.** §6 gives this door epics,
tracks and waves, so "it needs several agents" is not by itself a reason to
split. The honest version of the suggestion is about *uncertainty*: a change
where the requirements are the risky part wants to be smaller. One where you
know what you want and the work is simply large is fine as it is.

## 8. Stop

When `tech-spec.md` is settled, stop. Don't write code, don't "just start the
first step".

Report: the folder path, the number, what `## What` says in one line, how many
`## Done when` bullets there are, the files `tech-spec.md` names, the size
test's verdict, and `/implement-vibe-with-docs <N>` as the next command.

## Re-running it

`/vibe-with-docs 4` on an existing folder resumes: read both files, say where
the conversation left off, and carry on from the first thing still open. Don't
re-ask what `## Decided` already answers.

`/vibe-with-docs` bare, with folders in `specs/`, lists them with their
phase — spec open, tech spec open, ready to build — and asks which.
