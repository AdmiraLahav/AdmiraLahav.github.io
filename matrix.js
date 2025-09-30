/*
  matrix.js — shared background engine for all pages
  -------------------------------------------------
  Drop this file next to index.html / Projects.html and include with:
    <script src="matrix.js"></script>

  Responsibilities:
    - Draws the matrix rain on #matrix and its blurred clone #matrix-blur
    - Handles resize
    - Basic perf optimization: pause drawing when scrolled far below the hero

  Page scripts should handle:
    - Navbar show/hide
    - Section animations (IntersectionObserver)
*/

(function(){
  const canvas = document.getElementById('matrix');
  const ctx = canvas.getContext('2d');
  const canvasBlur = document.getElementById('matrix-blur');
  const ctxBlur = canvasBlur.getContext('2d');

  function resizeCanvas(){
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvasBlur.width = window.innerWidth;
    canvasBlur.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', () => {
    resizeCanvas();
    columns = Math.floor(window.innerWidth / fontSize);
    drops = Array(columns).fill(1);
  });

  const letters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const fontSize = 18;
  let columns = Math.floor(window.innerWidth / fontSize);
  let drops = Array(columns).fill(1);
  let running = true; // toggled by scroll for perf

  function drawMatrix(context){
    context.fillStyle = 'rgba(0, 0, 0, 0.05)';
    context.fillRect(0, 0, window.innerWidth, window.innerHeight);
    context.fillStyle = '#0080ff';
    context.font = fontSize + 'px monospace';
    for (let i = 0; i < drops.length; i++) {
      const text = letters[Math.floor(Math.random() * letters.length)];
      context.fillText(text, i * fontSize, drops[i] * fontSize);
      if (drops[i] * fontSize > window.innerHeight && Math.random() > 0.975) {
        drops[i] = 0;
      }
      drops[i]++;
    }
  }

  function render(){
    if (!running) return;
    drawMatrix(ctx);
    drawMatrix(ctxBlur);
  }

  // ~30 FPS
  setInterval(render, 33);

  // Pause matrix when scrolled far below first screen (battery saver)
  function onScroll(){ running = window.scrollY < window.innerHeight * 2; }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();
