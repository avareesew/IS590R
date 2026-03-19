# Example training documents (test fixtures)

Use this folder for **real PDFs** you’ll run through the parser while building and validating the pipeline.

## How to add files

**Recommended layout — one folder per company / doc set:**

```
fixtures/training-docs/
├── README.md                 ← you are here
├── uhp-eco-auto-body/        ← slug = short, anonymized if needed
│   └── training-handbook.pdf
├── company-b/
│   └── sales-playbook.pdf
└── company-c/
    ├── onboarding.pdf
    └── objections-appendix.pdf
```

- **Slug naming:** lowercase, hyphens (e.g. `acme-collision`, `generic-saas-vendor`). Avoid client legal names in the path if the repo is ever public.
- **Multiple PDFs:** Same company → same subfolder. The app can upload many files in one job; keeping them grouped matches how you’ll test.

## What these are for

- **Manual checks:** extraction quality, denoising, section tagging.
- **Golden / regression tests:** later you can point automated tests at a known fixture path (e.g. `fixtures/training-docs/uhp-eco-auto-body/`).
- **Diversity:** different industries and PDF layouts stress the pipeline more than one doc.

## Git / GitHub — do not commit training files

The repo root **`.gitignore`** ignores **everything** under `fixtures/training-docs/` **except** this `README.md`. PDFs, Word docs, notes, and subfolders **will not** be tracked or pushed.

- Keep all real training materials **only** on your machine (or share outside Git if your course allows).
- If you **already committed** a PDF by mistake, remove it from history with:
  `git rm -r --cached fixtures/training-docs/` then commit (and consider [BFG](https://rtyley.github.io/bfg-repo-cleaner/) or `git filter-repo` if it was pushed — secrets rotate if exposed).

Put **non-sensitive** checklists (e.g. expected objection counts for class) in **`aiDocs/`**, not in this folder, if you want them in the repo.

## Don’t put secrets here

No API keys, no credentials — only training PDFs and, if needed, small `.md` notes per folder (e.g. `NOTES.md` with expected objection counts for your own testing).
