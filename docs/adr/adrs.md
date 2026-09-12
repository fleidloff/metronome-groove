# Decisions

Every architectural decision taken in this project, newest last. An ADR records
a decision that **constrains work that has not happened yet** — reversing it
would cost real rework, not just an edit.

A decision that supersedes another names the number it replaces, and the old
record is edited to ⛔ **Superseded by**. Nothing here is deleted.

[0000-template.md](0000-template.md) is the shape to copy.

| # | Decision | Status | Date |
| :-- | :-- | :-- | :-- |
| [0001](0001-enforced-import-graph.md) | Enforce the import graph with generated per-feature ESLint zones | ✅ Accepted | 2026-09-12 |
| [0002](0002-tailwind-v4.md) | Tailwind v4 as the styling layer | ✅ Accepted | 2026-09-12 |
| [0003](0003-snippets.md) | User-facing text lives in `src/lib/snippets/`, by language | ✅ Accepted | 2026-09-12 |
| [0004](0004-bluetooth-media-buttons.md) | What a Bluetooth speaker's button can and cannot do | ✅ Accepted | 2026-09-12 |
| [0005](0005-styling-lives-in-the-design-system.md) | Styling lives in the design system, and a feature holds none | ✅ Accepted | 2026-09-12 |
| [0006](0006-rhythm-instruments-only.md) | Rhythm instruments only, never anything melodic | ✅ Accepted | 2026-09-12 |
| [0007](0007-a-groove-is-humanized-a-click-is-not.md) | A groove is humanized in time; the click never is | ✅ Accepted | 2026-09-12 |
| [0008](0008-sample-calibration-is-derived-not-copied.md) | A sample's velocity calibration is derived here, never copied from the sibling pack | ✅ Accepted | 2026-09-12 |
| [0009](0009-the-setup-lives-in-the-browser.md) | The setup lives in the browser, one versioned object, validated per value | ✅ Accepted | 2026-09-12 |
| [0010](0010-a-marked-bar-modifies-the-figure.md) | A marked bar modifies the figure and never replaces it | ✅ Accepted | 2026-09-12 |
