// Restored alert button behavior (original)
const learnBtn = document.getElementById("learnBtn");
if (learnBtn) {
  learnBtn.addEventListener("click", () => {
    alert("You’re officially learning web design, AdmiraLahav!");
  });
}
// XSS demo (unsafe, scripts allowed)
const submitBtn = document.getElementById("submitBtn");
if (submitBtn) {
  submitBtn.addEventListener("click", () => {
    const input = document.getElementById("userInput").value;
    const output = document.getElementById("outputArea");

    // Inject HTML normally
    output.innerHTML = input;

    // Now execute any <script> tags inside the input
    const scripts = output.querySelectorAll("script");

    scripts.forEach(oldScript => {
      const newScript = document.createElement("script");
      // Copy inline JS
      newScript.textContent = oldScript.textContent;
      // Replace it in the DOM (this makes the browser *execute* it)
      oldScript.parentNode.replaceChild(newScript, oldScript);
    });
  });
}


// One persistent audio object
const audio = new Audio("03 - Beginning In The End.mp3");

function play_song() {
    // Stop current playback immediately
    audio.pause();
    audio.currentTime = 0;

    // Start from the beginning each time
    audio.play()
        .catch(err => console.error("Playback error:", err));
}

function stop_song() {
    audio.pause()
}

/* ================================
   XSS PAYLOAD LIBRARY (BLUE THEME)
================================ */

const payloads = [

  // 1 — Matrix Blue Theme
  `<script>
  document.body.style.background = "#090d12";
  document.body.style.color = "#00aaff";
  document.body.style.textShadow = "0 0 6px #0090e0";
  document.body.innerHTML += "<h1 style='text-align:center;color:#00aaff;'>Matrix Blue Mode Activated</h1>";
  </script>`,

  // 2 — Fake Login Popup (Blue UI)
  `<script>
  document.body.innerHTML += \`
  <div style="
    position:fixed;top:0;left:0;width:100%;height:100%;
    backdrop-filter:blur(6px);
    background:rgba(0,0,0,0.65);
    display:flex;align-items:center;justify-content:center;
    font-family:Poppins,sans-serif;color:#e0f0ff;
  ">
    <div style="
      background:#101820;
      padding:30px;
      border:2px solid #00aaff;
      border-radius:10px;
      width:320px;
      text-align:center;
      box-shadow:0 0 12px #00aaff;
    ">
      <h2 style="color:#00aaff;">Authentication Required</h2>
      <input placeholder="Username" style="
        width:90%;padding:10px;margin:10px 0;
        border:1px solid #00aaff;background:#0e141b;color:#e0f0ff;
      ">
      <input type="password" placeholder="Password" style="
        width:90%;padding:10px;margin:10px 0;
        border:1px solid #00aaff;background:#0e141b;color:#e0f0ff;
      ">
      <button style="
        background:#00aaff;border:none;color:white;
        padding:10px 22px;border-radius:6px;cursor:pointer;
      ">Login</button>
    </div>
  </div>\`;
  </script>`,

  // 3 — Word Replacement (Blue Alert)
  `<script>
  const replaceWith = "⚠ SYSTEM BREACHED ⚠";
  document.querySelectorAll("*").forEach(el=>{
    if(el.childNodes.length===1 && el.childNodes[0].nodeType===3){
      el.style.color = "#00aaff";
      el.textContent = replaceWith;
    }
  });
  </script>`,

  // 4 — Infinite Rotation (Blue)
  `<script>
  document.body.style.animation = "spin 6s linear infinite";
  document.body.innerHTML += "<style>@keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }</style>";
  </script>`,

  // 5 — Bouncing Buttons (Blue Theme)
  `<script>
  for(let i=0;i<100;i++){
    const b = document.createElement("button");
    b.textContent = "Click";
    b.style.position="fixed";
    b.style.left=Math.random()*100+"vw";
    b.style.top=Math.random()*100+"vh";
    b.style.transition="0.2s";
    b.style.background="#00aaff";
    b.style.color="#fff";
    b.style.border="none";
    b.style.padding="8px 16px";
    b.style.borderRadius="6px";
    b.style.cursor="pointer";
    b.onmouseover=()=>{ 
      b.style.left=Math.random()*100+"vw"; 
      b.style.top=Math.random()*100+"vh"; 
    };
    document.body.appendChild(b);
  }
  </script>`,

  // 6 — Screen Shake (Blue UI stays intact)
  `<script>
  setInterval(()=>{
    document.body.style.transform = 
      "translate(" + (Math.random()*15-7) + "px," + (Math.random()*15-7) + "px)";
  }, 60);
  </script>`,

  // 7 — Neon Cyber Glow (Blue)
  `<script>
  document.body.style.background="#090d12";
  document.querySelectorAll("*").forEach(el=>{
    el.style.color="#e0f0ff";
    el.style.textShadow="0 0 10px #00aaff";
  });
  </script>`
];


/* ================================
   RANDOM PAYLOAD GENERATOR
================================ */

function generateRandomPayload() {
  const index = Math.floor(Math.random() * payloads.length);
  const payload = payloads[index];

  // Write in pretty box
  document.getElementById("payloadContent").innerText = payload;

  // Auto-insert to XSS field
  document.getElementById("userInput").value = payload;
}


/* ================================
   SITE CORRUPTOR (Blue Themed Chaos)
================================ */

function corruptSite() {
  const payload = `
<script>
  document.body.innerHTML = "";
  setInterval(()=>{
    const d=document.createElement("div");
    d.textContent="💀";
    d.style.position="fixed";
    d.style.left=Math.random()*100+"vw";
    d.style.top=Math.random()*100+"vh";
    d.style.fontSize=(Math.random()*80+20)+"px";
    d.style.color="#00aaff";
    document.body.appendChild(d);
  },50);
</script>`;

  document.getElementById("payloadContent").innerText = payload;
  document.getElementById("userInput").value = payload;
}


/* ================================
   BUTTON WIRING
================================ */

document.getElementById("genPayloadBtn").addEventListener("click", generateRandomPayload);
document.getElementById("corruptBtn").addEventListener("click", corruptSite);

