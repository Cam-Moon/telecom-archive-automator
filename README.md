# Telecom Archive & SMS/MMS Audit Trail Automator

An end-to-end extraction and ETL pipeline to pull historical contacts, SMS/MMS transcripts, and multimedia attachments from Vonage, archive media assets locally, and generate indexed, thumbnail-embedded audit spreadsheets.

> **Status:** These scripts were built for and used against the Vonage Business web app during a migration. The author no longer has a Vonage account, so the JavaScript stages can't be re-tested against the live API. The Python stage can be tested with the sample data in this repo (see [Quick Test](#quick-test)). If Vonage changes its API, see [Adapting to API Changes](#adapting-to-api-changes).

## Business Challenge & Impact
* **Context:** During a business communications migration off a legacy VoIP/telecom platform (Vonage), historical client text threads, contacts, and MMS attachments needed to be archived for compliance and claims records.
* **Problem:** Native platform exports produced disconnected message histories without inline media, separating critical image documentation (photos, signed documents, receipts) from customer conversation timelines. Contact exports were also prone to pagination failures.
* **Solution:** Built a local automation pipeline that extracts contacts and conversational message histories across hundreds of client numbers, batch-downloads all MMS attachments, and reconstructs multi-tab client workbooks embedding inline thumbnails.
* **Impact:** Preserved complete client communication audit trails, eliminated hours of manual file cross-referencing, and kept all customer data on the local machine during processing.

## Security & Privacy Measures
* **No Hardcoded Secrets:** Bearer tokens and account IDs are requested at runtime via browser prompts, so they never end up in source control.
* **CSV/Spreadsheet Formula Injection:** The contact exporter escapes quotes and prefixes values that start with `=`, `+`, `-`, `@`, tab, or carriage return. Phone numbers (digits, `+`, spaces, `()`, `.`, `-` only) are left as-is so they import cleanly into other systems.
* **DOM-Safe UI:** The photo downloader's progress overlay is built with `createElement`/`.textContent` only (no `innerHTML` with data).
* **Pinned Third-Party Code:** JSZip is loaded from cdnjs with a Subresource Integrity (SRI) hash, so the browser rejects any copy that isn't the official 3.10.1 build.
* **Decompression-Bomb Guard:** The Python stage caps Pillow at 50 megapixels per image.
* **Offline Workbook Build:** Stage 4 runs entirely offline.

## Pipeline Overview

| Stage | Script | Runs in | Input | Output |
|---|---|---|---|---|
| 1 | `vonage_contact_exporter.js` | Browser console (logged into Vonage) | Address Book ID + token | `Vonage_Contacts_Safe_Export.csv` |
| 2 | `vonage_sms-final.js` | Browser console (logged into Vonage) | User ID + token | `vonage_sms_backup_UNRESTRICTED.json` (or `..._PARTIAL.json`) |
| — | *(manual / your own script)* | — | Stage 2 JSON | `Vonage_SMS_History_Full_Tabs.xlsx` + the `attachments` list for Stage 3 |
| 3 | `download_photos_Final.js` | Browser console (logged into Vonage) | `attachments` list + token | `Vonage_Photos_Backup.zip` (unzip to `Vonage_Photos/`) |
| 4 | `merge_photos_to_excel.py` | Local Python | Workbook + `Vonage_Photos/` | `Vonage_SMS_History_With_Photos.xlsx` |

**Getting the IDs and token:** log into the Vonage Business web app, open DevTools → Network, and click into contacts/messages. The requests to `api.vonagebusiness.com` show the Address Book ID / User ID in the URL and the token in the `authorization: Bearer ...` header. Tokens expire, so grab a fresh one right before each run.

### Stage 1: Contact Extraction (`vonage_contact_exporter.js`)
Paginates through the Vonage address book API using cursor-based paging, sanitizes output, and exports a CSV (`First Name, Last Name, Phone Number, Company`). If the token expires or a page fails partway through, the contacts fetched so far are still saved and you're alerted that the export is incomplete.

Limitation: only the first phone number per contact is exported (preferring `TEL` type); emails and additional numbers are not.

### Stage 2: SMS Ingestion (`vonage_sms-final.js`)
Sweeps all messages oldest-first by timestamp and exports the raw JSON. Exact duplicate messages (which can appear where pages overlap) are dropped. If the sweep stops early (token expired, network error, or the 500-page / ~100,000-message safety limit), the file is named `vonage_sms_backup_PARTIAL.json` and a warning is printed in the console.

### Bridging Stage 2 → 3/4 (not included)
The repo does **not** include a script that converts the Stage 2 JSON into the Stage 4 workbook or the Stage 3 `attachments` list; this step was done separately. If you need to rebuild it, produce files that match the formats below.

### Stage 3: Asset Fetching (`download_photos_Final.js`)
For each entry in the `attachments` array, requests a temporary S3 presigned URL from Vonage, downloads the image, and packs everything into a ZIP behind a progress overlay. The array in the repo contains **mock entries**; replace them with your own. Failed downloads are logged in the console and skipped.

### Stage 4: Audit Generation (`merge_photos_to_excel.py`)
Matches local photos to message rows, embeds thumbnails, and adds relative hyperlinks to the full-size images.

## Data Formats Between Stages

These are the contracts that let the stages fit together. If you rebuild or replace a stage, match these.

**Stage 3 `attachments` entries**
```js
{ "messageId": "<Vonage message ID>", "attachmentId": "<attachment ID>", "filename": "<phone>_<YYYY-MM-DD>_<name>.<ext>" }
```

**Photo filenames (`Vonage_Photos/`)** — `<phone>_<YYYY-MM-DD>_<anything>.<ext>`, e.g. `555-010-0001_2026-10-11_sample.jpg`. The first two `_`-separated parts are the match key, so the phone part must not contain `_`.

**Stage 4 input workbook (`Vonage_SMS_History_Full_Tabs.xlsx`)**
* One sheet (tab) per conversation, **named exactly like the `<phone>` part** of the photo filenames.
* Row 1 is a header row.
* **Column A:** date as text in `YYYY-MM-DD` (matches the `<YYYY-MM-DD>` part of the photo filename).
* **Column D:** message text. Rows that had a photo must contain the marker `[Image/Attachment]`.
* Columns B and C are free for your own use (e.g. direction, sender). Columns **E** (Thumbnail) and **F** (Image Link) are overwritten by the script.

**Matching rule:** for each `[Image/Attachment]` row, the script takes the next unused photo whose key is `<sheet name>_<column A>`. With several photos on the same day, they're assigned in alphabetical filename order, so name them so that sorts chronologically if order matters.

## Quick Test
The repo includes a sample workbook and two sample photos.
```bash
pip install -r requirements.txt
python merge_photos_to_excel.py
```
This creates `Vonage_SMS_History_With_Photos.xlsx` with two embedded thumbnails. Keep the output workbook in the same folder as `Vonage_Photos/` — the image links are relative to the workbook's location, so move or sync them together (this works on local drives and OneDrive/SharePoint).

## Adapting to API Changes
The Vonage endpoints and response fields these scripts rely on, in case something breaks:

| Script | Endpoint | Fields used |
|---|---|---|
| Stage 1 | `GET /contacts/5/addressbooks/{id}?pageSize=200&...` | `contacts[]` (`firstName`, `lastName`, `organization`, `addresses[]` with `type`/`value`), `cursor` |
| Stage 2 | `GET /messages/9/users/{userId}/messages?newerTime=...&type=...` | Response is an array of messages; `creationTime` (ms) drives paging |
| Stage 3 | `GET /pandora/v1/messages/{messageId}/attachments?downloadAttachmentRequests=...` | `[0].urls[0].presigned_url.url` |

The `/5/` and `/9/` path segments are API versions; a newer version may change field names.

## Stack & Dependencies
* **Languages:** JavaScript (ES2020, run in a modern browser console), Python 3.9+
* **Libraries:** `openpyxl`, `Pillow` (see `requirements.txt`), `JSZip` 3.10.1 (loaded automatically by Stage 3)
