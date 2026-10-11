# Telecom Archive & MMS Audit Trail Automator

An end-to-end extraction and ETL pipeline to pull historical SMS/MMS transcripts and multimedia attachments from Vonage, archive media assets locally, and generate indexed, thumbnail-embedded audit spreadsheets.

---

## 📌 Business Challenge & Impact

- **Context:** During a business communications migration off a legacy VoIP/telecom platform (Vonage), historical client text threads and MMS attachments needed to be archived for compliance and claims records.

- **Problem:** Native platform exports produced disconnected message histories without inline media, separating critical image documentation (photos, signed documents, receipts) from customer conversation timelines.

- **Solution:** Built a 3-stage local pipeline that:
  1. Extracted conversational message histories across hundreds of client numbers via browser console automation.
  2. Batch-downloaded all MMS attachments with structured, timestamped file naming.
  3. Reconstructed multi-tab client workbooks embedding in-memory lightweight thumbnails (`Pillow`) and persistent relative links (`openpyxl`).

- **Impact:** Preserved complete client communication audit trails, eliminated hours of manual file cross-referencing, and maintained 100% data privacy by executing processing locally.

---

## 🏗️ Pipeline Overview

**Stage 1: Ingestion** (`vonage_sms_final.js`)
- Executes authenticated GET requests against the Vonage API to chronologically sweep and export raw JSON message transcripts.

**Stage 2: Asset Fetching** (`download_photos_FINAL.js`)
- Parses raw message payloads for image attachments, retrieves temporary S3 presigned URLs, and batch-downloads media locally via JSZip.

**Stage 3: Audit Generation** (`merge_photos_to_excel.py`)
- Matches local photos to message rows, compresses in-memory thumbnails, and creates an indexed, multi-tab Excel workbook with relative hyperlinks.

---

## 🚀 Key Technical Highlights

- **In-Memory Thumbnail Generation:** Utilizes `Pillow` and `io.BytesIO()` to generate and embed 55x55 thumbnails on the fly, optimizing file size.
- **Local/Cloud Link Parity:** Relative hyperlink design guarantees links function whether opened on local encrypted storage (BitLocker) or enterprise cloud drives (OneDrive for Business).
- **Offline & Zero-Exposure:** Final workbook construction runs entirely offline with zero external network transmission of customer data.

---

## 🛠️ Stack & Dependencies

- **Languages:** JavaScript (ES6), Python 3.13+
- **Core Libraries:** `openpyxl`, `Pillow`, `JSZip`