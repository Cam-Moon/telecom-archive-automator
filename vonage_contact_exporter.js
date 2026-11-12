// ==========================================
// SECURE VONAGE CONTACT EXTRACTOR (Final Version)
// ==========================================
const addressBookId = prompt("Enter your Vonage Address Book ID (from the network tab):");
const bearerToken = prompt("Enter your Bearer Token (just the token, no 'Bearer ' prefix):");

if (!addressBookId || !bearerToken) {
    console.error("❌ Missing credentials. Extraction aborted.");
} else {
    const baseUrl = `https://api.vonagebusiness.com/contacts/5/addressbooks/${addressBookId}?since=0&order=OLDEST_FIRST&pageSize=200&additionalTypes=CALL_GROUP,CALL_QUEUE`;
    
    const requestOptions = {
        headers: {
            "accept": "application/json, text/plain, */*",
            "authorization": `Bearer ${bearerToken}`,
        },
        method: "GET"
    };

    let allContacts = [];

    // Escapes quotes and blocks spreadsheet formula injection
    // (values starting with = + - @ tab or carriage return).
    function sanitizeForCSV(value) {
        if (value === null || value === undefined) return "";
        let sanitized = String(value).split('"').join('""');
        if (/^[=+\-@\t\r]/.test(sanitized)) {
            sanitized = "'" + sanitized;
        }
        return sanitized;
    }

    // Phone numbers commonly start with "+" (e.g. +15551234567), which the
    // generic rule above would prefix with a stray apostrophe. A value made of
    // only phone characters can't be a formula, so leave it untouched.
    function sanitizePhoneForCSV(value) {
        if (value === null || value === undefined) return "";
        const str = String(value).trim();
        if (/^\+?[0-9\s().\-]+$/.test(str)) return str;
        return sanitizeForCSV(str);
    }

    function fetchContacts(currentUrl) {
        fetch(currentUrl, requestOptions)
            .then(res => {
                if (!res.ok) {
                    if (res.status === 401) {
                        if (allContacts.length > 0) {
                            alert(`❌ Token expired mid-export. Saving the ${allContacts.length} contacts fetched so far (export is INCOMPLETE).`);
                            buildAndDownloadCSV();
                        } else {
                            alert("❌ Authentication Error: Token expired or invalid.");
                        }
                        throw new Error("Token expired");
                    }
                    if (allContacts.length > 0) {
                        alert(`⚠️ Pagination failed, but saving ${allContacts.length} contacts.`);
                        buildAndDownloadCSV();
                    }
                    throw new Error(`Status: ${res.status}`);
                }
                return res.json();
            })
            .then(data => {
                let contacts = data.contacts || [];
                allContacts = allContacts.concat(contacts);

                // Continue turning the page as long as a cursor exists 
                // and the API is still returning at least 1 contact.
                if (data.cursor && contacts.length > 0) {
                    let nextUrl = new URL(currentUrl);
                    nextUrl.searchParams.delete("since");
                    nextUrl.searchParams.set("cursor", data.cursor);
                    
                    fetchContacts(nextUrl.toString());
                } else {
                    alert(`✅ Success! Exported ${allContacts.length} contacts.`);
                    buildAndDownloadCSV();
                }
            })
            .catch(err => console.error("Script Error:", err.message));
    }

    function buildAndDownloadCSV() {
        let csv = "First Name,Last Name,Phone Number,Company\n";

        allContacts.forEach(c => {
            let fName = sanitizeForCSV(c.firstName);
            let lName = sanitizeForCSV(c.lastName);
            let company = sanitizeForCSV(c.organization);

            let phone = "";
            if (c.addresses && c.addresses.length > 0) {
                let tel = c.addresses.find(a => a.type === "TEL") || c.addresses[0];
                phone = sanitizePhoneForCSV(tel.value);
            }

            csv += `"${fName}","${lName}","${phone}","${company}"\n`;
        });

        let blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        let link = document.createElement("a");
        let url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "Vonage_Contacts_Safe_Export.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    console.log("Starting secure extraction...");
    fetchContacts(baseUrl);
}