/* MD Template Creator
   - No persistence: refresh resets to default preset.
   - Presets via dropdown.
   - Form fields + toggles control optional blocks.
   - Output is plain Markdown text for copy-paste.
*/

(() => {
  "use strict";

  // ---------- DOM helpers ----------
  const $ = (id) => document.getElementById(id);

  const el = {
    preset: $("preset"),
    title: $("title"),
    desc: $("desc"),
    tags: $("tags"),
    features: $("features"),
    steps: $("steps"),
    notes: $("notes"),

    tBadges: $("tBadges"),
    tToc: $("tToc"),
    tMeta: $("tMeta"),
    tFooter: $("tFooter"),

    out: $("output"),
    btnCopy: $("btnCopy"),
    btnReset: $("btnReset"),
    toast: $("toast"),

    dbgPreset: $("dbgPreset"),
    dbgChars: $("dbgChars"),
    dbgLast: $("dbgLast"),
  };

  // ---------- Presets ----------
  // Each preset has:
  // - defaults: initial values for fields and toggles
  // - template: markdown skeleton using {{TOKENS}} + {{BLOCKS}}
  const PRESETS = {
    readme_basic: {
      name: "README, Basic",
      defaults: {
        title: "My Project",
        desc: "One sentence about what this is.",
        tags: "markdown, template",
        features: "- Fast\n- Simple\n- Copy-paste output",
        steps: "1. Edit fields\n2. Copy output\n3. Paste into a .md file",
        notes: "Optional notes here.",
        toggles: { badges: false, toc: true, meta: false, footer: true },
      },
      template: [
        "{{BADGES}}",
        "# {{TITLE}}",
        "",
        "{{DESCRIPTION}}",
        "",
        "{{TOC}}",
        "## Features",
        "{{FEATURES}}",
        "",
        "## How to use",
        "{{STEPS}}",
        "",
        "## Notes",
        "{{NOTES}}",
        "",
        "{{FOOTER}}",
      ].join("\n"),
    },

    readme_cyber: {
      name: "README, Cyber",
      defaults: {
        title: "AdmiraLahav Project",
        desc: "Cyber-themed tool or demo. Quick brief and intent.",
        tags: "cyber, security, demo",
        features: "- Threat model notes\n- Logs and artifacts\n- Repro steps included",
        steps: "1. Clone repo\n2. Run locally\n3. Validate behavior\n4. Document findings",
        notes: "Add OPSEC, scope, and safety notes.",
        toggles: { badges: true, toc: true, meta: true, footer: true },
      },
      template: [
        "{{BADGES}}",
        "# {{TITLE}}",
        "",
        "{{META}}",
        "",
        "{{DESCRIPTION}}",
        "",
        "{{TOC}}",
        "## Scope",
        "- Intended use: personal lab / demo",
        "- Data: non-sensitive",
        "- Storage: none",
        "",
        "## Features",
        "{{FEATURES}}",
        "",
        "## Steps",
        "{{STEPS}}",
        "",
        "## Notes",
        "{{NOTES}}",
        "",
        "{{FOOTER}}",
      ].join("\n"),
    },

    lab_report: {
      name: "Lab Report",
      defaults: {
        title: "Lab Report - Topic",
        desc: "Goal of the lab in 1-2 sentences.",
        tags: "lab, report, school",
        features: "- Observation 1\n- Observation 2\n- Observation 3",
        steps: "1. Setup\n2. Execution\n3. Results\n4. Conclusion",
        notes: "Write what worked, what failed, and what you would improve.",
        toggles: { badges: false, toc: true, meta: true, footer: false },
      },
      template: [
        "# {{TITLE}}",
        "",
        "{{META}}",
        "",
        "## Goal",
        "{{DESCRIPTION}}",
        "",
        "{{TOC}}",
        "## Method",
        "{{STEPS}}",
        "",
        "## Results",
        "{{FEATURES}}",
        "",
        "## Notes",
        "{{NOTES}}",
      ].join("\n"),
    },

    notes: {
      name: "Notes",
      defaults: {
        title: "Notes - Topic",
        desc: "What is this note page about?",
        tags: "notes, personal",
        features: "- Key point\n- Key point\n- Key point",
        steps: "- Link: \n- Source: \n- Command: ",
        notes: "Open questions:\n- \n- ",
        toggles: { badges: false, toc: false, meta: false, footer: false },
      },
      template: [
        "# {{TITLE}}",
        "",
        "{{DESCRIPTION}}",
        "",
        "## Key points",
        "{{FEATURES}}",
        "",
        "## References",
        "{{STEPS}}",
        "",
        "## Open questions",
        "{{NOTES}}",
      ].join("\n"),
    },

    changelog: {
      name: "Changelog",
      defaults: {
        title: "Changelog",
        desc: "Track notable changes over time.",
        tags: "changelog, versions",
        features: "## [Unreleased]\n- \n\n## [0.1.0] - YYYY-MM-DD\n- Initial release",
        steps: "",
        notes: "",
        toggles: { badges: false, toc: false, meta: false, footer: false },
      },
      template: [
        "# {{TITLE}}",
        "",
        "{{DESCRIPTION}}",
        "",
        "{{FEATURES}}",
      ].join("\n"),
    },
  };

  // ---------- Template blocks ----------
  function buildBadges(tagsCsv) {
    // Simple badge set that looks good in GitHub README
    // Uses shields.io markdown images. If you do not want external badges, disable the toggle.
    const tags = splitTags(tagsCsv);
    const safeTop = tags[0] || "markdown";
    const safeSecond = tags[1] || "template";

    const badges = [
      `![status](https://img.shields.io/badge/status-active-${encodeURIComponent("00c853")}.svg)`,
      `![tag](https://img.shields.io/badge/tag-${encodeURIComponent(safeTop)}-${encodeURIComponent("66d9ef")}.svg)`,
      `![tag](https://img.shields.io/badge/tag-${encodeURIComponent(safeSecond)}-${encodeURIComponent("3ea6ff")}.svg)`,
    ];
    return badges.join(" ");
  }

  function buildMeta(tagsCsv) {
    const tags = splitTags(tagsCsv);
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const dateStr = `${y}-${m}-${d}`;

    const lines = [
      "> **Meta**",
      `> - Date: ${dateStr}`,
      `> - Tags: ${tags.length ? tags.join(", ") : "none"}`,
      `> - Reset behavior: refresh wipes fields`,
    ];
    return lines.join("\n");
  }

  function buildToc(enabled, presetKey) {
    if (!enabled) return "";

    // Keep TOC deterministic, not smart parsing.
    // Build per preset, so it always matches what you generate.
    const tocMap = {
      readme_basic: ["Features", "How to use", "Notes"],
      readme_cyber: ["Scope", "Features", "Steps", "Notes"],
      lab_report: ["Goal", "Method", "Results", "Notes"],
      notes: ["Key points", "References", "Open questions"],
      changelog: [],
    };
    const items = tocMap[presetKey] || [];
    if (!items.length) return "";

    const lines = [
      "## Table of contents",
      ...items.map((t) => `- [${t}](#${slugify(t)})`),
      "",
    ];
    return lines.join("\n");
  }

  function buildFooter(enabled) {
    if (!enabled) return "";
    return [
      "---",
      "_Generated with MD Template Creator. Copy, paste, commit._",
    ].join("\n");
  }

  // ---------- Utilities ----------
  function splitTags(tagsCsv) {
    return String(tagsCsv || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 8);
  }

  function slugify(text) {
    // GitHub-ish anchor slug
    return String(text)
      .trim()
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-");
  }

  function normalizeList(text, fallbackDash = "- ") {
    // If user leaves it empty, keep it as "- " to prevent blank sections.
    const t = String(text || "").trim();
    if (!t) return `${fallbackDash}`;
    return t;
  }

  function setLast(action) {
    el.dbgLast.textContent = action;
  }

  function toast(msg, ok = true) {
    el.toast.textContent = msg;
    el.toast.style.color = ok ? "var(--green)" : "var(--red)";
    el.toast.classList.add("show");
    window.clearTimeout(toast._t);
    toast._t = window.setTimeout(() => el.toast.classList.remove("show"), 1200);
  }

  // ---------- Core generation ----------
  function currentState() {
    return {
      presetKey: el.preset.value,
      title: el.title.value,
      desc: el.desc.value,
      tags: el.tags.value,
      features: el.features.value,
      steps: el.steps.value,
      notes: el.notes.value,
      toggles: {
        badges: el.tBadges.checked,
        toc: el.tToc.checked,
        meta: el.tMeta.checked,
        footer: el.tFooter.checked,
      },
    };
  }

  function generateMarkdown(state) {
    const preset = PRESETS[state.presetKey];
    if (!preset) return "";

    const blocks = {
      BADGES: state.toggles.badges ? buildBadges(state.tags) : "",
      META: state.toggles.meta ? buildMeta(state.tags) : "",
      TOC: buildToc(state.toggles.toc, state.presetKey),
      FOOTER: buildFooter(state.toggles.footer),
    };

    const tokens = {
      TITLE: (state.title || "").trim() || "Untitled",
      DESCRIPTION: (state.desc || "").trim() || "_No description yet._",
      FEATURES: normalizeList(state.features, "- "),
      STEPS: normalizeList(state.steps, "1. "),
      NOTES: (state.notes || "").trim() || "_No notes._",
    };

    let out = preset.template;

    // Replace blocks
    for (const [k, v] of Object.entries(blocks)) {
      out = out.replaceAll(`{{${k}}}`, v);
    }

    // Replace tokens
    for (const [k, v] of Object.entries(tokens)) {
      out = out.replaceAll(`{{${k}}}`, v);
    }

    // Cleanup: remove extra blank lines from empty blocks
    out = out.replace(/\n{3,}/g, "\n\n").trim() + "\n";
    return out;
  }

  function render(actionLabel = "render") {
    const state = currentState();
    const md = generateMarkdown(state);

    el.out.value = md;
    el.dbgPreset.textContent = state.presetKey;
    el.dbgChars.textContent = String(md.length);
    setLast(actionLabel);
  }

  // ---------- Preset application ----------
  function applyPreset(presetKey, actionLabel = "apply preset") {
    const preset = PRESETS[presetKey];
    if (!preset) return;

    const d = preset.defaults;

    el.title.value = d.title;
    el.desc.value = d.desc;
    el.tags.value = d.tags;
    el.features.value = d.features;
    el.steps.value = d.steps;
    el.notes.value = d.notes;

    el.tBadges.checked = !!d.toggles.badges;
    el.tToc.checked = !!d.toggles.toc;
    el.tMeta.checked = !!d.toggles.meta;
    el.tFooter.checked = !!d.toggles.footer;

    render(actionLabel);
  }

  // ---------- Actions ----------
  async function copyOutput() {
    const text = el.out.value || "";
    if (!text.trim()) {
      toast("Nothing to copy.", false);
      setLast("copy failed");
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      toast("Copied.");
      setLast("copy");
    } catch (err) {
      // Fallback for older browsers or blocked clipboard permissions
      try {
        el.out.focus();
        el.out.select();
        const ok = document.execCommand("copy");
        toast(ok ? "Copied." : "Copy blocked.", ok);
        setLast(ok ? "copy fallback" : "copy blocked");
      } catch (e) {
        toast("Copy blocked.", false);
        setLast("copy blocked");
      }
    }
  }

  function wireEvents() {
    // Any input change re-renders output
    const rerenderOn = [
      el.title, el.desc, el.tags, el.features, el.steps, el.notes,
      el.tBadges, el.tToc, el.tMeta, el.tFooter,
    ];

    rerenderOn.forEach((node) => {
      node.addEventListener("input", () => render("input"));
      node.addEventListener("change", () => render("change"));
    });

    el.preset.addEventListener("change", () => {
      applyPreset(el.preset.value, "preset changed");
    });

    el.btnCopy.addEventListener("click", copyOutput);
    el.btnReset.addEventListener("click", () => applyPreset(el.preset.value, "reset"));

    // Keyboard shortcut: Ctrl+C inside output copies selected text anyway.
    // Add extra: Ctrl+Shift+C copies full output.
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.shiftKey && (e.key === "C" || e.key === "c")) {
        e.preventDefault();
        copyOutput();
      }
    });
  }

  function boot() {
    wireEvents();

    // Default preset on load, no persistence.
    el.preset.value = "readme_basic";
    applyPreset(el.preset.value, "boot");
  }

  boot();
})();