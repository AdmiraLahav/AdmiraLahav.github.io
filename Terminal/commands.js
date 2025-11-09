// commands.js — external command definitions for Fake Linux Terminal
// Utility shortcuts (all global objects already exist in main file)
function cmdPrint(t, c) { return printLine(t, c); }
function pathOf(arg) { return resolvePath(arg || cwd); }

// Register command helper (provided by main HTML)
if (typeof registerCommand !== 'function') {
  console.error('registerCommand missing — ensure main script defines it.');
}

// ==========================
//  Core commands
// ==========================

registerCommand('help', async () => {
  const cmds = Object.keys(COMMANDS).sort().join('  ');
  printLine(cmds);
});

registerCommand('ls', async (args) => {
  const dir = pathOf(args[0]);
  if (!isAllowedPath(dir)) return printLine('permission denied','muted');
  if (Array.isArray(FS[dir])) printLine(FS[dir].join('  '));
  else printLine('ls: not a directory','muted');
});

registerCommand('pwd', async () => printLine(cwd));

registerCommand('cd', async (args) => {
  let target = pathOf(args[0] || '/');
  if (args[0] === '..') {
    target = cwd.substring(0, cwd.lastIndexOf('/')) || '/';
  }
  if (!isAllowedPath(target)) return printLine('permission denied','muted');
  if (Array.isArray(FS[target])) cwd = target;
  else printLine('cd: no such directory','muted');
});

registerCommand('cat', async (args) => {
  if (!args[0]) return printLine('cat: missing file','muted');
  const path = pathOf(args[0]);
  if (!isAllowedPath(path)) return printLine('permission denied','muted');
  if (typeof FS[path] === 'string') printLine(FS[path]);
  else printLine('cat: no such file','muted');
});

registerCommand('clear', async () => term.innerHTML = '');

registerCommand('echo', async (args) => printLine(args.join(' ')));

registerCommand('whoami', async () => printLine(currentUser));

registerCommand('date', async () => printLine(new Date().toString()));

registerCommand('uptime', async () =>
  printLine(((Date.now() - uptimeStart) / 1000).toFixed(1) + ' seconds')
);

registerCommand('filetree', async () => {
  if (currentUser !== 'root') return printLine('permission denied','muted');
  printTree('/');
  function printTree(path, indent = '') {
    if (Array.isArray(FS[path])) {
      printLine(indent + path);
      FS[path].forEach(p => printTree((path === '/' ? '/' : path + '/') + p, indent + '  '));
    } else if (typeof FS[path] === 'string') {
      printLine(indent + path.split('/').pop());
    }
  }
});

registerCommand('open', async (args) => {
  if (!args[0]) return printLine('open: filename','muted');
  window.open(args[0], '_blank');
});

registerCommand('fetchfile', async (args) => {
  if (!args[0]) return printLine('fetchfile: provide filename','muted');
  const fpath = pathOf(args[0]);
  if (!isAllowedPath(fpath)) return printLine('permission denied','muted');
  try {
    const res = await fetch(FILES_BASE + args[0], { cache: 'no-store' });
    if (!res.ok) throw new Error();
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = args[0]; a.click();
    printLine('download started: ' + args[0]);
  } catch {
    printLine('fetchfile: not found', 'muted');
  }
});

registerCommand('su', async (args) => startSu(args[0]));

registerCommand('exit', async () => {
  if (currentUser === 'root') {
    currentUser = normalUser;
    cwd = `/users/${normalUser}/home`;
    printLine('exit');
  } else {
    printLine('logout');
  }
});

// ==========================
//  Custom commands
// ==========================

// --- nano editor ---
registerCommand('nano', async (args) => {
  const filename = args[0] || 'untitled.txt';
  printLine(`Opening nano for ${filename}... (type text below, finish with CTRL+S or ESC)`);

  const textarea = document.createElement('textarea');
  textarea.style.width = '100%';
  textarea.style.height = '200px';
  textarea.style.background = 'rgba(0,0,0,0.6)';
  textarea.style.color = 'var(--text)';
  textarea.style.fontFamily = 'inherit';
  textarea.style.border = '1px solid rgba(255,255,255,0.1)';
  textarea.style.padding = '6px';
  term.appendChild(textarea);
  textarea.focus();

  return new Promise((resolve) => {
    function finishEditing() {
      const text = textarea.value;
      textarea.remove();
      printLine(`\n[File closed: ${filename}]`);

      const choice = confirm("Copy to clipboard? Click 'Cancel' to download instead.");
      if (choice) {
        navigator.clipboard.writeText(text)
          .then(() => printLine('[Copied to clipboard]'));
      } else {
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        printLine(`[Downloaded ${filename}]`);
      }
      resolve();
    }

    textarea.addEventListener('keydown', e => {
      if ((e.ctrlKey && e.key === 's') || e.key === 'Escape') {
        e.preventDefault();
        finishEditing();
      }
    });
  });
});
