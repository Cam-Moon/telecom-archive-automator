(async function() {
    console.log("%cStarting Vonage Photo Bulk Downloader...", "color: #00aaff; font-size: 16px; font-weight: bold;");

    // 1. Load JSZip
    if (typeof JSZip === 'undefined') {
        console.log("Loading JSZip library...");
        await new Promise(resolve => {
            let script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
            script.onload = resolve;
            document.head.appendChild(script);
        });
    }
    const zip = new JSZip();
    const folder = zip.folder("Vonage_Photos");

    // 2. Secure Token Handling (No longer hardcoded for GitHub safety)
    const token = prompt("Enter your Vonage Bearer Token (just the token, no 'Bearer ' prefix):");
    if (!token) {
        console.error("❌ Missing token. Extraction aborted.");
        return;
    }

    const headers = { 
        "accept": "application/json", 
        "authorization": "bearer " + token 
    };

    // 3. Photo attachments array (SCRUBBED for mock data)
    const attachments = [
        {"messageId": "mock_msg_1", "attachmentId": "mock_att_1", "filename": "555-010-0001_2025-10-14_sample1.png"},
        {"messageId": "mock_msg_2", "attachmentId": "mock_att_2", "filename": "555-010-0002_2025-10-17_sample2.jpg"}
    ];

    console.log(`Found ${attachments.length} photos to download. Starting...`);
    let successCount = 0;

    // ==========================================
    // SECURITY FIX 1: Secure Progress Overlay
    // ==========================================
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); color:white; z-index:999999; display:flex; flex-direction:column; align-items:center; justify-content:center; font-family:sans-serif; font-size:24px;';

    const heading = document.createElement('h2');
    heading.style.color = '#00ff88';
    heading.textContent = 'Downloading Your Photos...';

    const progressText = document.createElement('p');
    progressText.id = 'progress-text';
    progressText.textContent = `0 / ${attachments.length} Photos Processed`;

    const barContainer = document.createElement('div');
    barContainer.style.cssText = 'width:50%; background:#222; border-radius:10px; margin-top:20px; overflow:hidden;';

    const progressBar = document.createElement('div');
    progressBar.id = 'progress-bar';
    progressBar.style.cssText = 'width:0%; height:30px; background:#00ff88; transition:width 0.3s;';

    barContainer.appendChild(progressBar);
    overlay.appendChild(heading);
    overlay.appendChild(progressText);
    overlay.appendChild(barContainer);
    document.body.appendChild(overlay);

    // ==========================================
    // DOWNLOAD LOOP
    // ==========================================
    for (let i = 0; i < attachments.length; i++) {
        try {
            const att = attachments[i];
            const originalName = att.filename.split('_').pop();
            const encodedName = encodeURIComponent(originalName);
            
            const reqStr = encodeURIComponent(`{"attachmentId":"${att.attachmentId}","attachmentDownloadDetailsRequestList":[{"type":"original","response-content-disposition":"attachment; filename=\\"${encodedName}\\""}]}`);
            const apiUrl = `https://api.vonagebusiness.com/pandora/v1/messages/${att.messageId}/attachments?downloadAttachmentRequests=${reqStr}`;
            
            let res = await fetch(apiUrl, { headers });
            let data = await res.json();
            
            const s3Url = data[0].urls[0].presigned_url.url;
            
            let imgRes = await fetch(s3Url);
            let imgBlob = await imgRes.blob();
            
            folder.file(att.filename, imgBlob);
            successCount++;
            
            document.getElementById('progress-text').textContent = `${i + 1} / ${attachments.length} Photos Downloaded`;
            document.getElementById('progress-bar').style.width = `${((i + 1) / attachments.length) * 100}%`;
            
            await new Promise(r => setTimeout(r, 200));
        } catch (e) {
            console.error(`Failed on image ${i + 1}: `, e);
        }
    }

    document.getElementById('progress-text').textContent = "Zipping files... please wait!";
    document.getElementById('progress-bar').style.background = "#ffbb00";

    const content = await zip.generateAsync({type:"blob"});
    const link = document.createElement("a");
    link.href = URL.createObjectURL(content);
    link.download = "Vonage_Photos_Backup.zip";
    link.click();

    // ==========================================
    // SECURITY FIX 2: Secure Completion Overlay
    // ==========================================
    overlay.innerHTML = ''; // Safely clear the progress bar nodes

    const doneHeading = document.createElement('h1');
    doneHeading.style.color = '#00ff88';
    doneHeading.textContent = '✅ All Done!';

    const doneText = document.createElement('p');
    doneText.textContent = `${successCount} photos successfully packed into Vonage_Photos_Backup.zip`;

    const refreshText = document.createElement('p');
    refreshText.style.cssText = 'font-size:16px; margin-top:30px; color:#aaa;';
    refreshText.textContent = '(You can refresh the page to close this screen)';

    overlay.appendChild(doneHeading);
    overlay.appendChild(doneText);
    overlay.appendChild(refreshText);

})();
