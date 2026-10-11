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
    
    // 2. Your active token (SCRUBBED FOR GITHUB)
    const token = "YOUR_BEARER_TOKEN_HERE";
    const headers = { "accept": "application/json", "authorization": "bearer " + token };
    
    // 3. Photo attachments array (SCRUBBED: Replaced 180+ real client numbers with mock data)
    const attachments = [
        {"messageId": "mock_msg_1", "attachmentId": "mock_att_1", "filename": "555-010-0001_2025-10-14_sample1.png"}, 
        {"messageId": "mock_msg_2", "attachmentId": "mock_att_2", "filename": "555-010-0002_2025-10-17_sample2.jpg"}
    ];
    
    console.log(`Found ${attachments.length} photos to download. Starting...`);
    let successCount = 0;
    
    const overlay = document.createElement('div');
    overlay.style = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); color:white; z-index:999999; display:flex; flex-direction:column; align-items:center; justify-content:center; font-family:sans-serif; font-size:24px;';
    overlay.innerHTML = `<h2 style="color:#00ff88;">Downloading Your Photos...</h2><p id="progress-text">0 / ${attachments.length} Photos Processed</p><div style="width:50%; background:#222; border-radius:10px; margin-top:20px; overflow:hidden;"><div id="progress-bar" style="width:0%; height:30px; background:#00ff88; transition:width 0.3s;"></div></div>`;
    document.body.appendChild(overlay);

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
            
            document.getElementById('progress-text').innerText = `${i + 1} / ${attachments.length} Photos Downloaded`;
            document.getElementById('progress-bar').style.width = `${((i + 1) / attachments.length) * 100}%`;

            await new Promise(r => setTimeout(r, 200));

        } catch (e) {
            console.error(`Failed on image ${i + 1}: `, e);
        }
    }
    
    document.getElementById('progress-text').innerText = "Zipping files... please wait!";
    document.getElementById('progress-bar').style.background = "#ffbb00";

    const content = await zip.generateAsync({type:"blob"});
    const link = document.createElement("a");
    link.href = URL.createObjectURL(content);
    link.download = "Vonage_Photos_Backup.zip";
    link.click();
    
    overlay.innerHTML = `<h1 style="color:#00ff88;">✅ All Done!</h1><p>${successCount} photos successfully packed into Vonage_Photos_Backup.zip</p><p style="font-size:16px; margin-top:30px; color:#aaa;">(You can refresh the page to close this screen)</p>`;

})();