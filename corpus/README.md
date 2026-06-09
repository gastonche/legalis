# Cameroon Legal Corpus — README

_Generated 2026-06-08. A small, verified corpus of **primary** Cameroon legal source texts for a legal-research RAG project._

## What this is

- `primary/` — downloaded, verified primary legal texts, organized by type. **This is the ingestion set.**
- `secondary/` — reference links/maps to sources (Library of Congress guide, GlobaLex, case-law & portal links). **Not** primary law; keep out of the ingestion set.
- `manifest.json` + `MANIFEST.md` — full provenance record (every item: title, type, language, source + authority, URL, status, local path, size, SHA-256, date).
- `_quarantine/` — files that failed verification or were wrong versions, with `.note.txt` explanations.
- `_discovery/` — raw discovery output (candidate lists from each source) and the fetch plan, for auditability.

## What was collected

**38 verified primary texts** (124.9 MB):

- **Constitution (6)** — consolidated text (FR + EN), plus the 2008 amendment act (FR+EN) and 1996 base text (FR).
- **OHADA Uniform Acts (11)** — **all 10 current Uniform Acts (FR, authoritative) + the OHADA Treaty.** All are current/revised versions **with text layers**: AUDCG (2010), AUSCGIE (2014), AUS (2010), AUPSRVE/voies d'exécution (2023), AUPC (2015), Arbitration (2017), SYSCOHADA/accounting (2017), Transport (2003), Cooperatives (2010), Mediation (2017).
- **National Codes (11)** — Penal Code (FR+EN), Criminal Procedure Code (FR+EN), Labour Code (FR+EN), General Tax Code 2024 (FR), Civil Code (FR), Code of Civil Procedure (FR), Code of Military Justice (bilingual), General Code of Decentralized Local Authorities (FR).
- **Ordinances (2)** — Civil Status Registration 81/02 (FR), Land tenure ordinances 1974 (FR/EN).
- **Statutes & Decrees (8)** — Copyright 2000 (FR+EN), Judicial Organization 2006 (FR), Penal Code amendment 2019 (FR), Environmental framework 1996 (FR), Competition 1998 (FR), Consumer Protection 2011 (FR), Anti-Terrorism 2014 (FR).

## Language coverage

- **French:** 31 files — the corpus is FR-dominant (FR is authoritative for OHADA and most national law).
- **English:** 9 files — solid EN for the **Constitution, Penal Code, Criminal Procedure Code, Labour Code, Copyright law**, and the bilingual Military Justice & 1974 land ordinances.
- **EN gaps:** OHADA Uniform Acts (only FR collected — official EN translations are currently unavailable, see below), General Tax Code, Civil/Civil-Procedure codes, and most ordinances/statutes are FR-only.

## Coverage gaps & manual-fetch list

Everything below is recorded in the manifest; grab these by hand if needed:

- **Constitution of Cameroon — base text 1996 (English)** — https://www.wipo.int/wipolex/en/legislation/details/7391  
  _Signed-PDF URL for EN could not be auto-extracted; redundant with the consolidated EN texts already downloaded._
- **OHADA — Uniform Act on General Commercial Law (AUDCG) — English unofficial translation** — https://www.ohada.org/attachments/article/482/AUDCG_EN_Reviewed_Unofficial_Translation.pdf  
  _Official EN translation link returns HTTP 404 (site restructured); no clean mirror verified. French text is authoritative and is in the corpus._
- **OHADA — Uniform Act on Commercial Companies and the EIG (AUSCGIE) — English unofficial translation** — https://www.ohada.org/attachments/article/537/AUSCGIE-EN_Unofficial_Translation.pdf  
  _Official EN translation link returns HTTP 404 (site restructured); no clean mirror verified. French text is authoritative and is in the corpus._
- **OHADA — Uniform Act on Collective Proceedings (AUPC) — English unofficial translation** — https://www.ohada.org/attachments/article/473/AUPCAP-EN_Unofficial_Translation.pdf  
  _Official EN translation link returns HTTP 404 (site restructured); no clean mirror verified. French text is authoritative and is in the corpus._
- **Civil Status Registration Ordinance 81/02 — English reproduction** — https://dignitylawchambers.com/wp-content/uploads/2021/04/Republic-of-Cameroon-Civil-Status-Registration.pdf  
  _Host unreachable at fetch time (HTTP 000). The French ordinance is in the corpus._

Other known gaps:

- **OHADA English translations** (AUDCG, AUSCGIE, AUPC) — official `ohada.org` links now 404; the French texts (authoritative) are included.
- **Recent (2025–2026) PRC laws** (e.g. electoral-code / constitutional-council amendments) appear only on JS-rendered landing pages with no direct file — fetch manually from https://www.prc.cm/en/news/the-acts if needed.
- **Case law** beyond the Juricaf portal link is not collected.

## Important notes for ingestion

- **3 image-only PDFs need OCR** before text ingestion (no extractable text layer): `code/fr_code-justice-militaire_2017.pdf`, `statute/fr_loi-organisation-judiciaire_2006.pdf`, `statute/fr_loi-repression-terrorisme_2014.pdf`. The other 35 have usable text layers.
- A few OHADA PDFs from the OHADA digital library have **partial** text layers (e.g. voies d'exécution 2023, arbitration, mediation) — content was verified but OCR may improve extraction quality.
- **MINJUSTICE (minjustice.gov.cm) is served over plain HTTP** (HTTPS refused); its files were fetched over HTTP. They are public official documents (no auth).
- Files are kept **as-is** (originals) for the ingestion pipeline to parse. Filenames follow `<lang>_<short-title>_<year>.<ext>`.
- **Licensing:** all `primary/` items are public/official primary legal texts or openly-licensed (the EN consolidated Constitution is CC BY-NC from Constitute Project). Secondary items are link-only; GlobaLex is author-copyrighted (link only).

## Verification method

Each download was checked for: correct file type (PDF magic bytes), non-empty, not an error/login/captcha HTML page, valid page count, and a text/visual content match to the expected law (accent-normalized keyword match; scanned OHADA acts were visually verified page-by-page, which caught and corrected three wrong-version files from the OHADA digital library). robots.txt was checked per source; all downloaded document paths were robots-allowed. A normal browser User-Agent and a 2 s inter-request delay were used; blocked/broken sources (droit-afrique 403, LoC bot-block) were not forced and are logged.
