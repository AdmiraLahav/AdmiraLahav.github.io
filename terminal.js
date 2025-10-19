
====== terminal.js ======
/* Terminal logic. Template style. Modify commands object to add or change commands. */
(() =>{
  const urlUser = new URLSearchParams(location.search).get('user') || 'guest';
  const term = document.getElementById('terminal');
  const output = document.getElementById('output');
  const cmdline = document.getElementById('cmdline');
  const promptEl = document.getElementById('prompt');
  const btnClear = document.getElementById('btn-clear');
  const btnHelp = document.getElementById('btn-help');

  const fs = {
    'readme.txt': 'This is a fake filesystem for your Github Pages terminal. Edit files in the repo to change contents.',
    'about.txt': 'Created for admiraLahav. Theme: light blue, black, dark grey, grey.',
    'notes/todo.txt': ' - add more commands\n - polish UI'
  };

  const state = {
    cwd: '~',
    history: [],
    hpos: 0
  };

  promptEl.textContent = `${urlUser}@tty:~$`;

  function print(text){
    output.innerHTML += text + '\n';
    term.querySelector('.term-body').scrollTop = term.querySelector('.term-body').scrollHeight;
  }

  function clear(){ output.innerHTML = ''; }

  const commands = {
    help(args){
      return `available: help ls cat pwd whoami date clear echo about open download files`;
    },
    ls(args){
      return Object.keys(fs).map(k=>k).join('\n');
    },
    cat(args){
      if(!args[0]) return 'usage: cat <filename>';
      const name = args.join(' ');
      if(fs[name]) return fs[name];
      return `cat: ${name}: no such file`;
    },
    pwd(){ return state.cwd; },
    whoami(){ return urlUser; },
    date(){ return new Date().toString(); },
    echo(args){ return args.join(' '); },
    clear(){ clear(); return ''; },
    about(){ return fs['about.txt']; },
    open(args){
      if(!args[0]) return 'usage: open <filename>';
      const name = args.join(' ');
      if(fs[name]){
        // simple popup viewer
        window.open('data:text/plain;charset=utf-8,'+encodeURIComponent(fs[name]));
        return `opened ${name} in new tab`;
      }
      return `open: ${name}: no such file`;
    },
    download(args){
      // simulated download. create blob from file if exists
      if(!args[0]) return 'usage: download <filename>';
      const name = args.join(' ');
      if(!fs[name]) return `download: ${name}: no such file`;
      const blob = new Blob([fs[name]], {type: 'text/plain'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name.replace(/[\/]/g,'_');
      a.click();
      return `downloaded ${name}`;
    },
    files(){ return Object.keys(fs).join('\n'); },
    sudo(){ return 'sudo: permission denied: this is fake'; }
  };

  function runCommand(line){
    if(!line.trim()) return;
    const parts = line.split(/\s+/);
    const cmd = parts[0];
    const args = parts.slice(1);
    if(commands[cmd]){
      try{
        const res = commands[cmd](args);
        if(res !== undefined && res !== '') print(res);
      }catch(e){ print('error running command'); }
    }else{
      print(`${cmd}: command not found`);
    }
  }

  // input handlers
  cmdline.addEventListener('keydown', (e)=>{
    if(e.key === 'Enter'){
      const val = cmdline.value;
      print(promptEl.textContent + ' ' + val);
      state.history.push(val);
      state.hpos = state.history.length;
      runCommand(val);
      cmdline.value = '';
      e.preventDefault();
    }else if(e.key === 'ArrowUp'){
      if(state.hpos>0) state.hpos--;
      cmdline.value = state.history[state.hpos] || '';
      e.preventDefault();
    }else if(e.key === 'ArrowDown'){
      if(state.hpos < state.history.length) state.hpos++;
      cmdline.value = state.history[state.hpos] || '';
      e.preventDefault();
    }else if(e.key === 'Tab'){
      e.preventDefault();
      const cur = cmdline.value;
      const options = Object.keys(commands).filter(k=>k.startsWith(cur));
      if(options.length === 1) cmdline.value = options[0] + ' ';
      else if(options.length>1) print(options.join(' '));
    }
  });

  // focus behavior: clicking inside terminal focuses input unless target or its ancestor has .no-focus
  term.addEventListener('click', (e)=>{
    if(e.target.closest('.no-focus')) return;
    cmdline.focus();
  });

  // buttons
  btnClear.addEventListener('click', ()=>{ clear(); cmdline.focus(); });
  btnHelp.addEventListener('click', ()=>{ print(commands.help()); cmdline.focus(); });

  // initial welcome
  print('Welcome ' + urlUser + '! Type "help" for commands.');
  cmdline.focus();

  // expose some globals for quick edits in console
  window._fakefs = fs;
  window._term = {print, clear, runCommand};

  // Notes: upgrade ideas below
  /*
    - Add clickable file tree and file editor (nano-like) that writes back to GitHub via API
    - Add themes selection and persisted settings (localStorage)
    - Add more realistic command output (process list, simulated networking)
    - Add custom prompt support and multi-user sessions
    - Add file permission simulation and user switching
  */

})();

====== end of files ======
