// Replicating LCS line diff calculation from CodeDiffEditor.tsx lines 68-127

function computeDiff(originalCode, modifiedCode) {
  const oldLines = originalCode.split(/\r?\n/);
  const newLines = modifiedCode.split(/\r?\n/);
  const m = oldLines.length;
  const n = newLines.length;

  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const result = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      result.push({
        type: "unchanged",
        oldLineNumber: i,
        newLineNumber: j,
        text: oldLines[i - 1],
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.push({
        type: "added",
        newLineNumber: j,
        text: newLines[j - 1],
      });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      result.push({
        type: "removed",
        oldLineNumber: i,
        text: oldLines[i - 1],
      });
      i--;
    }
  }

  result.reverse();

  let addCount = 0;
  let delCount = 0;
  result.forEach((line) => {
    if (line.type === "added") addCount++;
    if (line.type === "removed") delCount++;
  });

  return { lines: result, additions: addCount, deletions: delCount };
}

// Side-by-side mapping simulation as implemented in lines 303-345 of CodeDiffEditor.tsx
function simulateSideBySideView(originalCode, modifiedCode, diffLines) {
  const leftCol = originalCode.split(/\r?\n/).map((lineText, idx) => {
    const lineNum = idx + 1;
    const isRemoved = diffLines.some((l) => l.type === "removed" && l.oldLineNumber === lineNum);
    return { lineNum, text: lineText, isRemoved };
  });

  const rightCol = modifiedCode.split(/\r?\n/).map((lineText, idx) => {
    const lineNum = idx + 1;
    const isAdded = diffLines.some((l) => l.type === "added" && l.newLineNumber === lineNum);
    return { lineNum, text: lineText, isAdded };
  });

  return { leftCol, rightCol };
}

console.log("=== EMPIRICAL TEST: CodeDiffEditor.tsx ===");

// 1. Test Empty Strings
console.log("\n--- 1. Testing Empty Strings ---");
const emptyRes = computeDiff("", "");
console.log("Empty vs Empty -> additions:", emptyRes.additions, "deletions:", emptyRes.deletions, "lines:", emptyRes.lines);

const emptyOrig = computeDiff("", "const a = 1;");
console.log("Empty Orig vs Modified -> additions:", emptyOrig.additions, "deletions:", emptyOrig.deletions, "lines:", emptyOrig.lines);

const emptyMod = computeDiff("const a = 1;", "");
console.log("Orig vs Empty Modified -> additions:", emptyMod.additions, "deletions:", emptyMod.deletions, "lines:", emptyMod.lines);

// 2. Test Identical Code
console.log("\n--- 2. Testing Identical Code ---");
const identicalCode = "function foo() {\n  return 42;\n}";
const identicalRes = computeDiff(identicalCode, identicalCode);
console.log("Identical -> additions:", identicalRes.additions, "deletions:", identicalRes.deletions, "total lines:", identicalRes.lines.length);

// 3. Test Single-Line Diffs
console.log("\n--- 3. Testing Single-Line Diffs ---");
const singleRes = computeDiff("let x = 1;", "let x = 2;");
console.log("Single-line diff -> additions:", singleRes.additions, "deletions:", singleRes.deletions, "lines:", singleRes.lines);

// 4. Test Side-by-Side Visual Alignment Flaw
console.log("\n--- 4. Testing Side-by-Side View Alignment ---");
const origCodeMulti = "line 1\nline 2 (to be deleted)\nline 3\nline 4";
const modCodeMulti = "line 1\nline 3\nline 4\nline 5 (added)";
const multiDiff = computeDiff(origCodeMulti, modCodeMulti);
const sideBySide = simulateSideBySideView(origCodeMulti, modCodeMulti, multiDiff.lines);

console.log("Left Column (Original, count:", sideBySide.leftCol.length, "):");
sideBySide.leftCol.forEach((l) => console.log(`  Row ${l.lineNum}: "${l.text}" (removed: ${l.isRemoved})`));

console.log("Right Column (Modified, count:", sideBySide.rightCol.length, "):");
sideBySide.rightCol.forEach((r) => console.log(`  Row ${r.lineNum}: "${r.text}" (added: ${r.isAdded})`));

if (sideBySide.leftCol.length !== sideBySide.rightCol.length) {
  console.log("  ❌ FLAW DETECTED: Row count mismatch in split view! Left column has", sideBySide.leftCol.length, "rows, Right column has", sideBySide.rightCol.length, "rows. Corresponding lines will be visually misaligned!");
}

// 5. Test Copy formatted diff when text contains special chars / empty diff
console.log("\n--- 5. Testing Clipboard / Callback edge cases ---");
const formattedDiff = emptyRes.lines.map((l) => {
  const prefix = l.type === "added" ? "+ " : l.type === "removed" ? "- " : "  ";
  return `${prefix}${l.text}`;
}).join("\n");
console.log("Formatted empty diff string:", JSON.stringify(formattedDiff));
