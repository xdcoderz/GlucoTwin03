# Prep Responsibility Matrix: AI vs Manual

## Legend
- 🤖 **AI can do automatically**: a coding assistant (Claude, Copilot, Cursor, etc.) can write/generate it. You only review and paste.
- 🤝 **Hybrid**: AI drafts, you must run/verify it on your machine.
- 🧑 **Manual**: you must install, sign up, click, or physically do it. AI cannot.

Important: AI can only automate code tasks if it can **see your code** (paste files, or use an agent like Claude Code inside the repo). Without that, mark everything below as 🤝.

## Friday Oct 30: make it run

| Task | Label | Notes |
|---|---|---|
| Install Docker Desktop, Git | 🧑 | Installers + restart |
| Write/repair `docker-compose.yml`, Dockerfiles | 🤖 | Give the AI your folder tree + errors |
| Add health checks and start-up ordering | 🤖 | |
| Run `docker compose up`, read errors | 🧑 | Paste errors to AI for fixes |
| Fresh-copy test in a new folder/user account | 🧑 | Must be done on a real machine |
| Correct prevalence wording in pitch | 🤝 | Use 60.9% for the 493-meal test set. The documented 64.9% is an eligible-label rate, not test prevalence; update the slide if needed. |
| CGM replay mode (deterministic) | 🤖 | Code change, then you run it |
| `.gitignore`, `LICENSE` | 🤖 | |
| Secret/local-path scan | 🤝 | AI provides `grep` commands; you run |

## Saturday Oct 31: content and polish

| Task | Label | Notes |
|---|---|---|
| Second demo patient JSON (high-score case) | 🤝 | AI drafts; you run the model and check the score is clearly high |
| Dashboard fixes (labels, units, safety banner) | 🤖 | |
| Fill exact names in FEATURE_DICTIONARY | 🤖 | From `model_metadata.json` / feature code |
| Verify API_CONTRACT against real controllers | 🤖 | Paste controllers, AI corrects the doc |
| Confirm ports in SETUP_AND_TOOLS | 🤖 | |
| Update PPT (slide 9 number, slide 11 status, team/college) | 🤖 | You supply team/college names |
| Take new dashboard screenshots | 🧑 | |
| Clinical review/sign-off (optional) | 🧑 | Needs a human reviewer |
| Read all docs for accuracy | 🧑 | You are accountable for every claim |

## Sunday Nov 1: dry run and backups

| Task | Label | Notes |
|---|---|---|
| Clean project rebuild (`docker compose down --remove-orphans`, rebuild, time it) | 🧑 | Avoid global Docker prune |
| `docker save` image export | 🤝 | AI gives commands; you run |
| Record backup video | 🧑 | OBS or OS recorder |
| Rehearse demo twice | 🧑 | |
| Copy backup to USB/cloud | 🧑 | |
| Pre-push check (large files, secrets) | 🤝 | |
| Draft pitch script / Q&A | 🤖 | |

## Monday Nov 2: submit

| Task | Label | Notes |
|---|---|---|
| Create GitHub account (if none) | 🧑 | Do this **before** Monday |
| Create repo, `git push` (authentication) | 🧑 | Needs your login/token |
| Make repo public, check README renders | 🧑 | |
| Fresh-clone on event machine, `docker compose up` | 🧑 | |
| Present | 🧑 | |

## Summary

| Category | What |
|---|---|
| 🤖 Automatable | Compose/Dockerfiles, replay mode, `.gitignore`/LICENSE, docs, feature dictionary, API contract, PPT text edits, pitch script |
| 🤝 Hybrid | Second demo patient, prevalence check, image export, secret scan |
| 🧑 Manual only | Installing tools, GitHub account/push, fresh-machine tests, screenshots, video, rehearsal, clinical review, presenting |

## Accounts and installs checklist (all 🧑)
- [ ] Docker Desktop installed and running
- [ ] Git installed
- [ ] GitHub account created, logged in, SSH key or personal access token ready
- [ ] (Optional) Git LFS
- [ ] OBS Studio or another screen recorder
- [ ] PowerPoint or LibreOffice


