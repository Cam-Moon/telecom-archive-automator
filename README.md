[README.md](https://github.com/user-attachments/files/34461259/README.md)
# telecom-archive-automator# Telecom Archive & SMS/MMS Audit Trail Automator

An end-to-end extraction and ETL pipeline to pull historical contacts, SMS/MMS transcripts, and multimedia attachments from Vonage, archive media assets locally, and generate indexed, thumbnail-embedded audit spreadsheets.

## Business Challenge & Impact
* **Context:** During a business communications migration off a legacy VoIP/telecom platform (Vonage), historical client text threads, contacts, and MMS attachments needed to be archived for compliance and claims records.
* **Problem:** Native platform exports produced disconnected message histories without inline media, separating critical image documentation (photos, signed documents, receipts) from customer conversation timelines. Contact exports were also prone to pagination failures.
* **Solution:** Built a local automation pipeline that extracts contacts and conversational message histories across hundreds of client numbers, batch-downloads all MMS attachments, and reconstructs multi-tab client workbooks embedding inline thumbnails.
* **Impact:** Preserved complete client communication audit trails, eliminated hours of manual file cross-referencing, and maintained 100% data privacy by executing processing locally.

## Security & Compliance
These scripts have been rigorously audited for security and data privacy:
* **Zero Hardcoded Secrets:** All API keys and Bearer Tokens are requested dynamically at runtime via browser prompts to prevent credential leakage in version control.
* **OWASP Compliant:** JavaScript extractors include active sanitization to prevent CSV/Spreadsheet Formula Injection. DOM-XSS vulnerabilities have been patched by strictly utilizing `.textContent` and `createElement` for UI generation.
* **Bandit Compliant:** Python components utilize safe pathing and resource management, explicitly preventing Pillow image decompression bombs (DoS) and path traversal attacks.

## Pipeline Overview

### Stage 1: Contact Extraction (`vonage_contact_exporter.js`)
* **Environment:** Browser Console
* **Function:** Safely paginates through the entire Vonage address book API using URL object management to prevent cursor-stacking loops, sanitizes output, and exports a clean CSV.

### Stage 2: SMS Ingestion (`vonage_sms_final.js`)
* **Environment:** Browser Console
* **Function:** Executes authenticated GET requests against the API to chronologically sweep and export raw JSON message transcripts. Includes fail-safes for infinite loop prevention.

### Stage 3: Asset Fetching (`download_photos_Final.js`)
* **Environment:** Browser Console
* **Function:** Parses raw message payloads for image attachments, retrieves temporary S3 presigned URLs, and batch-downloads media locally via JSZip behind a secure, DOM-safe progress overlay.

### Stage 4: Audit Generation (`merge_photos_to_excel.py`)
* **Environment:** Local Python Environment
* **Function:** Matches local photos to message rows, compresses in-memory thumbnails, and creates an indexed, multi-tab Excel workbook with relative hyperlinks.

## Key Technical Highlights
* **In-Memory Thumbnail Generation:** Utilizes Pillow and `io.BytesIO()` to generate and embed 55x55 thumbnails on the fly, optimizing file size.
* **Local/Cloud Link Parity:** Relative hyperlink design guarantees links function whether opened on local encrypted storage (BitLocker) or enterprise cloud drives (OneDrive for Business).
* **Offline & Zero-Exposure:** Final workbook construction runs entirely offline with zero external network transmission of customer data.

## Stack & Dependencies
* **Languages:** JavaScript (ES6), Python 3.13+
* **Core Libraries:** `openpyxl`, `Pillow`, `JSZip`
