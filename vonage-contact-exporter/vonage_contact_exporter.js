// ==========================================
// PART 1: AUTHENTICATION OPTIONS
// Paste your fresh 'Copy as fetch' data here.
// Note: Tokens expire after approximately one hour.
// ==========================================
let myOptions = {
  // EXAMPLE FORMAT:
  // "headers": {
  //   "accept": "application/json, text/plain, */*",
  //   "authorization": "bearer eyJhbG...",
  // },
  // "method": "GET"
};

// ==========================================
// PART 2: EXTRACTION SCRIPT
// ==========================================
let baseUrl = "https://api.vonagebusiness.com/contacts/5/addressbooks/3334383436312e34323231303934?since=0&order=OLDEST_FIRST&pageSize=200&additionalTypes=CALL_GROUP,CALL_QUEUE";
let allContacts = [];

function fetchContacts(url) {
    let cleanOptions = Object.assign({}, myOptions);
    delete cleanOptions.body;

    fetch(url, cleanOptions)
        .then(res => {
            if (!res.ok) {
                if (res.status === 401) {
                    alert("❌ Authentication Error: Your token expired! Please refresh the Vonage page and grab a new 'Copy as fetch'.");
                    throw new Error("Token expired");
                }
                // Failsafe: Download whatever was successfully grabbed before the error
                if (allContacts.length > 0) {
                    alert(`⚠️ Vonage stopped the next page, but we successfully saved ${allContacts.length} contacts! Downloading your file now...`);
                    buildAndDownloadCSV();
                } else {
                    alert(`❌ Server error: ${res.status}`);
                }
                throw new Error(`Status: ${res.status}`);
            }
            return res.json();
        })
        .then(data => {
            let contacts = data.contacts || [];
            allContacts = allContacts.concat(contacts);
            
            // Turn the page if the current batch is full
            if (data.cursor && contacts.length === 200) {
                let nextUrl = url.replace("since=0&", "") + "&cursor=" + encodeURIComponent(data.cursor);
                fetchContacts(nextUrl);
            } else {
                alert(`✅ Success! We found and exported ${allContacts.length} contacts. Check your downloads folder!`);
                buildAndDownloadCSV();
            }
        })
        .catch(err => console.error("Script Error:", err.message));
}

function buildAndDownloadCSV() {
    let csv = "First Name,Last Name,Phone Number,Company\n";
    
    allContacts.forEach(c => {
        let fName = (c.firstName || "").split('"').join('""');
        let lName = (c.lastName || "").split('"').join('""');
        let company = (c.organization || "").split('"').join('""');
        
        let phone = "";
        if (c.addresses && c.addresses.length > 0) {
            let tel = c.addresses.find(a => a.type === "TEL") || c.addresses[0];
            phone = tel.value || "";
        }
        
        csv += `"${fName}","${lName}","${phone}","${company}"\n`;
    });
    
    let blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    let link = document.createElement("a");
    let url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "Vonage_Contacts_For_Quo.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

console.clear();
fetchContacts(baseUrl);
