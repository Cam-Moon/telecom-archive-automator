# Telecom Archive Automator: Vonage to Quo Contact Exporter

This script automates the extraction of business contacts from Vonage Business Communications (VBC) into a properly formatted `.csv` file perfectly structured for direct import into the Quo phone system. 

Vonage lacks a native bulk-export feature for contacts, and their internal API enforces strict pagination and formatting rules. This script bypasses those limitations to run entirely within the browser console.

## How to Run the Script

1. **Grab a Secure Session Token:**
   * Log into your Vonage web portal and navigate to the **Contacts** page.
   * Open Developer Tools (F12) and go to the **Network** tab.
   * Refresh the page or type a letter in the search bar to load network activity.
   * Locate the request to the `/contacts/` endpoint, right-click it, select **Copy**, and choose **Copy as fetch**.
   * *Note: Security tokens expire after about an hour. If the script throws a `401 Unauthorized` error, refresh the page and grab a fresh fetch request.*

2. **Format the Script:**
   * Paste your copied fetch data into Part 1 of `vonage_contact_exporter.js`.
   * Change the very first line from `fetch("...", {` to `let myOptions = {`.

3. **Execute:**
   * Copy the entire updated script, paste it directly into your browser's **Console** tab, and press Enter.
   * A `.csv` file named `Vonage_Contacts_For_Quo.csv` will automatically generate and download.

## API Quirks & Script Architecture

* **Strict URL Parameters:** The Vonage API will reject requests with a `400 Bad Request` if specific parameters are missing. The script explicitly enforces `since=0` to capture the entire historical directory and `pageSize=200` to respect the server's maximum page limit constraint.
* **Failsafe Pagination:** Vonage uses a cursor bookmark system. If a batch fails or the server drops the connection on a subsequent page, the script halts and automatically downloads whatever contacts were successfully pulled up to that point. 
* **Quo Compatibility Integration:** The extraction logic maps Vonage's JSON output directly into Quo's required column headers (*First Name, Last Name, Phone Number*). It also includes a safe string replacement method (`.split('"').join('""')`) to bypass browser console regex parsing bugs, preventing data corruption during the CSV build.
