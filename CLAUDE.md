# metronome-groove

A metronome that plays a groove instead of a click. Next.js, TypeScript,
Tailwind v4, Vitest.

## Comments in code

**Code should explain itself, so avoid comments.** Don't narrate the code or the
change you just made. Leave a comment only for something genuinely non-obvious —
a workaround, a platform quirk, a ticket reference. Never write prose in a
comment.

Documentation goes in `docs/`, not in the source.

## Never commit

**Do not run `git commit`, `git push`, `git reset --hard`, or anything else that
rewrites history.** Leave changes in the working tree. Fred reads the diff and
commits.

Reading git — `status`, `diff`, `log`, `show` — is fine.

## The docs

Read the one that governs what you are about to change. They are the rules, not
background.

| Document | What it governs |
| :-- | :-- |
| [docs/persona.md](docs/persona.md) | Who this is for. A feature that does not serve Sam needs another reason |
| [docs/music.md](docs/music.md) | What it sounds like — metronome practice, the grooves, the sample pack |
| [docs/architecture.md](docs/architecture.md) | How the tree is shaped and why |
| [docs/coding-guidelines.md](docs/coding-guidelines.md) | The concrete rulebook. Read before writing code |
| [docs/testing.md](docs/testing.md) | What must be tested |
| [docs/adr/](docs/adr/) | Why the shape is this one, in the order it was decided |

### ADRs

`docs/adr/` holds one file per decision, and
[docs/adr/adrs.md](docs/adr/adrs.md) is the index every new record is added to.

An ADR records a decision that **constrains work that has not happened yet** —
reversing it would cost real rework, not just an edit. An implementation detail
is not an ADR.

Nothing is deleted. A decision that replaces another names the number it
supersedes, and the old record is marked ⛔ **Superseded by**.
[0000-template.md](docs/adr/0000-template.md) is the shape to copy.

## Agents

`.claude/agents/` holds six. Spawn them — that is what they are for, and several
of them can run at once on disjoint files.

| Agent | Use it for |
| :-- | :-- |
| `architect` | Turning requirements into a tech spec: contracts, tracks, waves |
| `test-writer` | The red step — failing tests before any implementation |
| `implementer` | The green step — production code under `src/` |
| `musician` | Anything about feel, timing or sound. It decides; it writes no code |
| `sam` | A product call that turns on the persona rather than on engineering |
| `verifier` | Grading a change against its `## Done when` bullets. It never fixes |

The skills in `.claude/skills/` drive them: `/vibe-with-docs` specs a change into
`specs/N-title/`, `/prototype` mocks it up, `/implement-vibe-with-docs` builds
it.

## Before calling anything done

```bash
npm test && npm run lint && npm run build
```

Run all three. Show what failed. Never claim it passes without having run it.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
