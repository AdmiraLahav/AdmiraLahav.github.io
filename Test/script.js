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

