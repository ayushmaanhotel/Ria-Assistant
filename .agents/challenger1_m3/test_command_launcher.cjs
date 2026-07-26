const ACTION_ITEMS = [
  { id: "persona:myraa", title: "Switch to MYRAA Persona", category: "Personas", description: "Standard assistant", badge: "MYRAA Core" },
  { id: "persona:ria", title: "Switch to Ria Persona", category: "Personas", description: "Custom companion", badge: "Ria Custom" },
  { id: "theme:violet", title: "Set Theme: Violet Dream", category: "Atmosphere", description: "Deep purple", badge: "Atmosphere" },
  { id: "theme:crimson", title: "Set Theme: Crimson Surge", category: "Atmosphere", description: "Fiery red", badge: "Atmosphere" },
  { id: "theme:emerald", title: "Set Theme: Emerald Cyber", category: "Atmosphere", description: "Matrix green", badge: "Atmosphere" },
  { id: "theme:celestial", title: "Set Theme: Celestial Sky", category: "Atmosphere", description: "Sky blue", badge: "Atmosphere" },
  { id: "theme:gold", title: "Set Theme: Solar Gold", category: "Atmosphere", description: "Warm amber", badge: "Atmosphere" },
  { id: "theme:rose", title: "Set Theme: Rose Quartz", category: "Atmosphere", description: "Pink", badge: "Atmosphere" },
  { id: "theme:charcoal", title: "Set Theme: Charcoal Slate", category: "Atmosphere", description: "Minimalist dark slate", badge: "Atmosphere" },
  { id: "open:telemetry", title: "Open Live System Telemetry", category: "Tools", description: "Inspect metrics", badge: "Modal" },
  { id: "open:codediff", title: "Open Code Diff Reviewer", category: "Tools", description: "Review code changes", badge: "Modal" },
  { id: "open:memories", title: "Open Memory Core Dashboard", category: "Tools", description: "Browse memories", badge: "Modal" },
  { id: "toggle:vision", title: "Toggle Screen Vision Reading", category: "Tools", description: "Enable vision", badge: "Toggle" },
  { id: "open:audio_settings", title: "Open Settings & Audio Config", category: "Tools", description: "Configure API keys", badge: "Settings" },
];

function filterActions(search) {
  const query = search.trim().toLowerCase();
  if (!query) return ACTION_ITEMS;
  return ACTION_ITEMS.filter(
    (item) =>
      item.title.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query) ||
      item.id.toLowerCase().includes(query)
  );
}

function handleKeyDownSim(eKey, filteredActions, selectedIndex, setSelectedIndex, onSelectAction, onClose) {
  if (filteredActions.length === 0) {
    if (eKey === "Escape") {
      onClose();
    }
    return;
  }

  if (eKey === "ArrowDown") {
    setSelectedIndex((prev) => (prev + 1) % filteredActions.length);
  } else if (eKey === "ArrowUp") {
    setSelectedIndex((prev) => (prev - 1 + filteredActions.length) % filteredActions.length);
  } else if (eKey === "Enter") {
    const chosen = filteredActions[selectedIndex];
    if (chosen) {
      onSelectAction(chosen.id);
      onClose();
    }
  } else if (eKey === "Escape") {
    onClose();
  }
}

console.log("=== EMPIRICAL TEST: CommandLauncher.tsx ===");

// 1. Rapid Typing Simulation
console.log("\n--- 1. Rapid Typing Simulation ---");
const queries = ["r", "ri", "ria", "ria ", "ria xyz", "xyz", "telemetry", ""];
for (const q of queries) {
  const res = filterActions(q);
  console.log(`Query: "${q}" -> Matches count: ${res.length}`);
}

// 2. Zero Matches Keyboard Behavior
console.log("\n--- 2. Zero Matches Keyboard Navigation ---");
const zeroMatches = filterActions("nonexistent_command_123");
console.log("Zero matches length:", zeroMatches.length);
let closed = false;
let selectedAction = null;
handleKeyDownSim("Enter", zeroMatches, 0, () => {}, (id) => { selectedAction = id; }, () => { closed = true; });
console.log("Press Enter on zero matches -> Action selected:", selectedAction, "Closed:", closed);

handleKeyDownSim("Escape", zeroMatches, 0, () => {}, (id) => { selectedAction = id; }, () => { closed = true; });
console.log("Press Escape on zero matches -> Closed:", closed);

// 3. Index Wrapping and Bounds Checking
console.log("\n--- 3. Index Wrapping and Bounds Checking ---");
const twoMatches = filterActions("persona"); // Myraa & Ria
console.log("Two matches count:", twoMatches.length);

let idx = 0;
const setIdx = (updater) => { idx = typeof updater === "function" ? updater(idx) : updater; };

// Test wrapping forward
handleKeyDownSim("ArrowDown", twoMatches, idx, setIdx, () => {}, () => {});
console.log("From 0 -> ArrowDown -> index:", idx);
handleKeyDownSim("ArrowDown", twoMatches, idx, setIdx, () => {}, () => {});
console.log("From 1 -> ArrowDown -> index:", idx); // Should wrap to 0

// Test wrapping backward
handleKeyDownSim("ArrowUp", twoMatches, idx, setIdx, () => {}, () => {});
console.log("From 0 -> ArrowUp -> index:", idx); // Should wrap to 1

// Test Stale / Out of bounds index (e.g. before useEffect resets)
console.log("\n--- 4. Stale Out-of-Bounds Index (e.g. idx = 10, actions = 2) ---");
let staleIdx = 10;
let actionTriggered = null;
handleKeyDownSim("Enter", twoMatches, staleIdx, () => {}, (id) => { actionTriggered = id; }, () => {});
console.log("Press Enter with stale out-of-bounds index 10 -> actionTriggered:", actionTriggered);

// Test scrollIntoView on zero matches element index
console.log("\n--- 5. Testing DOM scrollIntoView on zero matches ---");
// In CommandLauncher.tsx:
// listRef.current.children[selectedIndex]
// When zero matches, children count is 1 (the empty message div).
// index 0 accesses the empty message div and calls scrollIntoView on it!
console.log("Zero matches list children count: 1 (empty state msg div). Index 0 targets empty msg div.");
