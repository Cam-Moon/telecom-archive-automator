// 1. Inject only safe, static HTML (no variables)
overlay.innerHTML = `
    <h2 style="color:#00ff88;">Downloading Your Photos...</h2>
    <p id="progress-text"></p>
    <div style="width:50%; background:#222; border-radius:10px; margin-top:20px; overflow:hidden;">
        <div id="progress-bar" style="width:0%; height:30px; background:#00ff88; transition:width 0.3s;"></div>
    </div>
`;

// 2. Securely add the dynamic data as text
overlay.querySelector('#progress-text').textContent = `0 / ${attachments.length} Photos Processed`;
