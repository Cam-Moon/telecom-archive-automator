// ==========================================
// SECURE VONAGE CONTACT EXTRACTOR
// ==========================================
// Run this in the browser console. It will prompt for credentials securely 
// so no sensitive data is ever saved in this file or committed to GitHub.

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

    // OWASP FIX: Sanitize data to prevent CSV/Spreadsheet Formula Injection
    function sanitizeForCSV(value) {
        if (!value) return "";
        let sanitized = value.split('"').join('""'); // Escape double quotes
        if (/^[=+\-@]/.test(sanitized)) {
            sanitized = "'" + sanitized;             // Neutralize executable prefixes
        }
        return sanitized;
    }

    function fetchContacts(url) {
        fetch(url, requestOptions)
            .then(res => {
                if (!res.ok) {
                    if (res.status === 401) {
                        alert("❌ Authentication Error: Token expired or invalid.");
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

                if (data.cursor && contacts.length === 200) {
                    let nextUrl = url.replace("since=0&", "") + "&cursor=" + encodeURIComponent(data.cursor);
                    fetchContacts(nextUrl);
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
                phone = sanitizeForCSV(tel.value); 
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

    console.clear();
    console.log("Starting secure extraction...");
    fetchContacts(baseUrl);
}
