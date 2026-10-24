(async () => {
  // ==========================================
  // SECURE RUNTIME CREDENTIALS
  // ==========================================
  const userId = prompt("Enter your Vonage User ID:");
  const token = prompt("Enter your Vonage Bearer Token (no 'Bearer ' prefix):");

  if (!userId || !token) {
      console.error("❌ Missing credentials. Extraction aborted.");
      return;
  }

  const baseUrl = `https://api.vonagebusiness.com/messages/9/users/${userId}/messages`;
  const types = ['SMS', 'MMS', 'MMS_V2', 'GRP_SMS', 'GRP_SMS_OFFNET', 'GRP_MMS', 'GRP_CREATE', 'GRP_DELETE', 'GRP_JOIN', 'GRP_LEAVE', 'GRP_UNIFIED_MODIFICATION', 'SHR_SMS', 'SOCIAL_SHR_SMS', 'SOCIAL_SHR_MMS', 'SHR_MMS_V2', 'CONVERSATION_UPDATE', 'UPDATE', 'SYNC', 'SOCIAL_INVALID_TOKEN', 'PROCESS_STATUS_UPDATE', 'CONVERSATION_DELETE'];

  let allMessages = [];
  let currentNewerTime = 0; 
  let hasMore = true;
  let failsafe = 0; 

  console.log("Starting UNRESTRICTED full chronological sweep...");

  while (hasMore && failsafe < 500) {
    failsafe++;
    const params = new URLSearchParams({
      pageSize: 200,
      pageOrder: 'OLDEST_FIRST',
      sortOrder: 'OLDEST_FIRST',
      newerTime: currentNewerTime
    });
    types.forEach(t => params.append('type', t));

    try {
      const response = await fetch(`${baseUrl}?${params.toString()}`, {
        "headers": {
          "accept": "application/json",
          "authorization": `Bearer ${token}`, // Dynamically injected
        },
        "method": "GET"
      });

      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

      const data = await response.json();

      if (Array.isArray(data) && data.length > 0) {
        allMessages = allMessages.concat(data);

        const timestamps = data.map(m => Number(m.creationTime || 0)).filter(t => t > 0);

        if (timestamps.length > 0) {
            let maxTime = Math.max(...timestamps);
            currentNewerTime = (maxTime <= currentNewerTime) ? currentNewerTime + 1 : maxTime;
        } else {
            hasMore = false; 
        }

        console.log(`Fetched ${data.length} messages. Total secured so far: ${allMessages.length}`);

      } else {
        hasMore = false;
      }
    } catch (err) {
      console.error("Fetch failed. Your token might have timed out.", err);
      hasMore = false;
    }
  }

  if (allMessages.length === 0) return console.log("No messages found.");

  const blob = new Blob([JSON.stringify(allMessages, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vonage_sms_backup_UNRESTRICTED.json`;
  a.click();
  console.log("Export complete! Final JSON File downloaded.");
})();
