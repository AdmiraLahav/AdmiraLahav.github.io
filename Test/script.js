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
   XSS PAYLOAD LIBRARY
================================ */

const payloads = [

  // 1 — Matrix theme
  `<script>
  document.body.style.background = "black";
  document.body.style.color = "#0f0";
  document.body.innerHTML += "<h1>Matrix Override</h1>";
  </script>`,

  // 2 — Fake login popup
  `<script>
  document.body.innerHTML += \`
  <div style="position:fixed;top:0;left:0;width:100%;height:100%;
  backdrop-filter:blur(5px);background:#0009;display:flex;
  align-items:center;justify-content:center;color:#0f0;font-family:monospace;">
    <div style='padding:25px;border:2px solid #0f0;background:#000'>
      <h2>Session Expired</h2>
      <input placeholder="Username" style="margin:5px;"><br>
      <input type="password" placeholder="Password" style="margin:5px;"><br>
      <button>Login</button>
    </div>
  </div>\`;
  </script>`,

  // 3 — Word replacement
  `<script>
  document.querySelectorAll("*").forEach(el=>{
    if(el.childNodes.length===1 && el.childNodes[0].nodeType===3)
      el.textContent = "⚠ BREACHED ⚠";
  });
  </script>`,

  // 4 — Infinite rotation
  `<script>
  document.body.style.animation = "spin 4s linear infinite";
  document.body.innerHTML += "<style>@keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }</style>";
  </script>`,

  // 5 — Bouncing buttons
  `<script>
  for(let i=0;i<100;i++){
    const b = document.createElement("button");
    b.textContent = "??";
    b.style.position="fixed";
    b.style.left=Math.random()*100+"vw";
    b.style.top=Math.random()*100+"vh";
    b.style.transition="0.2s";
    b.onmouseover=()=>{ b.style.left=Math.random()*100+"vw"; b.style.top=Math.random()*100+"vh"; };
    document.body.appendChild(b);
  }
  </script>`,

  // 6 — Screen shake
  `<script>
  setInterval(()=>{
    document.body.style.transform = 
      "translate(" + (Math.random()*20-10) + "px," + (Math.random()*20-10) + "px)";
  }, 50);
  </script>`,

  // 7 — Neon cyber glow
  `<script>
  document.body.style.background="#000";
  document.querySelectorAll("*").forEach(el=>{
    el.style.color="#0ff";
    el.style.textShadow="0 0 8px #0ff";
  });
  </script>`
];


/* ================================
   RANDOM PAYLOAD GENERATOR
================================ */

function generateRandomPayload() {
  const box = document.getElementById("payloadBox");
  const index = Math.floor(Math.random() * payloads.length);
  const payload = payloads[index];

  box.innerText = payload;

  // Auto-insert for convenience:
  document.getElementById("userInput").value = payload;
}


/* ================================
   SITE CORRUPTOR (max chaos)
================================ */

function corruptSite() {
  const payload = `
  <script>
    document.body.innerHTML = "";
    let chaos = setInterval(()=>{
      const d = document.createElement("div");
      d.textContent = "💀";
      d.style.position="fixed";
      d.style.left=Math.random()*100+"vw";
      d.style.top=Math.random()*100+"vh";
      d.style.fontSize=(Math.random()*80+20)+"px";
      document.body.appendChild(d);
    }, 50);
  </script>`;

  document.getElementById("payloadBox").innerText = payload;
  document.getElementById("userInput").value = payload;
}


/* ================================
   BUTTON WIRING
================================ */

document.getElementById("genPayloadBtn").addEventListener("click", generateRandomPayload);
document.getElementById("corruptBtn").addEventListener("click", corruptSite);
