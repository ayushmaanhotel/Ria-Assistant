import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failedTests++;
  }
}

// Replicate validator assertion logic for edge case isolation
function validateCurriculumSchema(data, name) {
  if (!data || typeof data !== 'object') {
    return { valid: false, reason: "Root data must be an object" };
  }
  if (typeof data.level !== 'string') {
    return { valid: false, reason: "'level' is not a string" };
  }
  if (!Array.isArray(data.grades) || data.grades.length === 0) {
    return { valid: false, reason: "'grades' is not a non-empty array" };
  }
  if (!Array.isArray(data.modules) || data.modules.length === 0) {
    return { valid: false, reason: "'modules' is not a non-empty array" };
  }
  
  let validTopicsCount = 0;
  for (let mIdx = 0; mIdx < data.modules.length; mIdx++) {
    const mod = data.modules[mIdx];
    if (!mod || typeof mod !== 'object') {
      return { valid: false, reason: `Module [${mIdx}] is not an object` };
    }
    if (typeof mod.subject !== 'string' || mod.subject.trim().length === 0) {
      return { valid: false, reason: `Module [${mIdx}] 'subject' must be non-empty string` };
    }
    if (!Array.isArray(mod.topics) || mod.topics.length === 0) {
      return { valid: false, reason: `Module [${mIdx}] 'topics' must be non-empty array` };
    }
    for (const t of mod.topics) {
      if (t && typeof t === 'object' && t.title && t.content && (t.pedagogy_tip || t.explanation_strategy)) {
        validTopicsCount++;
      }
    }
  }

  if (validTopicsCount === 0) {
    return { valid: false, reason: "No valid topics with required fields (title, content, pedagogy_tip/explanation_strategy) found" };
  }

  return { valid: true, validTopicsCount };
}

console.log("=========================================================================");
console.log("CHALLENGER STRESS TEST: CURRICULUM VALIDATOR SCHEMA BOUNDARY EDGE CASES");
console.log("=========================================================================");

// 1. Boundary Edge Cases: Invalid Root / Structural Types
console.log("\n--- SUITE 1: Invalid Root & Structural Types ---");

const nullResult = validateCurriculumSchema(null, "Null Input");
assert(!nullResult.valid, "Edge Case [Null Root]: Correctly rejected null input");

const stringResult = validateCurriculumSchema("invalid string", "String Input");
assert(!stringResult.valid, "Edge Case [String Root]: Correctly rejected primitive string input");

const emptyObjResult = validateCurriculumSchema({}, "Empty Object");
assert(!emptyObjResult.valid, "Edge Case [Empty Object]: Correctly rejected object missing 'level'");

// 2. Boundary Edge Cases: Level Property Variants
console.log("\n--- SUITE 2: 'level' Property Boundaries ---");

const numLevel = { level: 123, grades: ["Class 1"], modules: [{ subject: "Math", topics: [{ title: "T", content: "C", pedagogy_tip: "P" }] }] };
assert(!validateCurriculumSchema(numLevel, "Numeric Level").valid, "Edge Case [Numeric Level]: Correctly rejected number for level");

const boolLevel = { level: true, grades: ["Class 1"], modules: [{ subject: "Math", topics: [{ title: "T", content: "C", pedagogy_tip: "P" }] }] };
assert(!validateCurriculumSchema(boolLevel, "Boolean Level").valid, "Edge Case [Boolean Level]: Correctly rejected boolean for level");

const arrayLevel = { level: ["Primary"], grades: ["Class 1"], modules: [{ subject: "Math", topics: [{ title: "T", content: "C", pedagogy_tip: "P" }] }] };
assert(!validateCurriculumSchema(arrayLevel, "Array Level").valid, "Edge Case [Array Level]: Correctly rejected array for level");

// 3. Boundary Edge Cases: Grades Array Boundaries
console.log("\n--- SUITE 3: 'grades' Array Boundaries ---");

const stringGrades = { level: "Primary", grades: "Class 1 to 5", modules: [{ subject: "Math", topics: [{ title: "T", content: "C", pedagogy_tip: "P" }] }] };
assert(!validateCurriculumSchema(stringGrades, "String Grades").valid, "Edge Case [String Grades]: Correctly rejected string for grades");

const emptyGrades = { level: "Primary", grades: [], modules: [{ subject: "Math", topics: [{ title: "T", content: "C", pedagogy_tip: "P" }] }] };
assert(!validateCurriculumSchema(emptyGrades, "Empty Grades").valid, "Edge Case [Empty Array Grades]: Correctly rejected empty grades array");

// 4. Boundary Edge Cases: Modules & Topics Schema Boundaries
console.log("\n--- SUITE 4: Modules & Topics Boundary Assertions ---");

const emptyModules = { level: "Primary", grades: ["Class 1"], modules: [] };
assert(!validateCurriculumSchema(emptyModules, "Empty Modules").valid, "Edge Case [Empty Modules]: Correctly rejected empty modules array");

const emptySubject = { level: "Primary", grades: ["Class 1"], modules: [{ subject: "   ", topics: [{ title: "T", content: "C", pedagogy_tip: "P" }] }] };
assert(!validateCurriculumSchema(emptySubject, "Empty Subject").valid, "Edge Case [Whitespace Subject]: Correctly rejected whitespace subject");

const emptyTopics = { level: "Primary", grades: ["Class 1"], modules: [{ subject: "Math", topics: [] }] };
assert(!validateCurriculumSchema(emptyTopics, "Empty Topics").valid, "Edge Case [Empty Topics Array]: Correctly rejected module with 0 topics");

const topicMissingTipAndStrategy = {
  level: "Primary",
  grades: ["Class 1"],
  modules: [{
    subject: "Math",
    topics: [{ title: "Addition", content: "Adding numbers" }] // missing pedagogy_tip and explanation_strategy
  }]
};
assert(!validateCurriculumSchema(topicMissingTipAndStrategy, "Missing Tip & Strategy").valid, "Edge Case [Topic Missing Tip/Strategy]: Correctly rejected topic without pedagogy tip or strategy");

const topicWithExplanationStrategy = {
  level: "Primary",
  grades: ["Class 1"],
  modules: [{
    subject: "Math",
    topics: [{ title: "Addition", content: "Adding numbers", explanation_strategy: "Use counters" }]
  }]
};
assert(validateCurriculumSchema(topicWithExplanationStrategy, "Explanation Strategy").valid, "Edge Case [Explanation Strategy Present]: Validated topic using explanation_strategy fallback");

const topicWithPedagogyTip = {
  level: "Primary",
  grades: ["Class 1"],
  modules: [{
    subject: "Math",
    topics: [{ title: "Addition", content: "Adding numbers", pedagogy_tip: "Use story analogy" }]
  }]
};
assert(validateCurriculumSchema(topicWithPedagogyTip, "Pedagogy Tip").valid, "Edge Case [Pedagogy Tip Present]: Validated topic using pedagogy_tip");

// 5. Production Datasets Regression Verification
console.log("\n--- SUITE 5: Production Datasets Boundary Verification ---");

const nurseryPath = path.join(rootDir, 'knowledge_base', 'tutor_dataset_mike', 'curriculum_nursery_lkg_ukg.json');
const primaryPath = path.join(rootDir, 'knowledge_base', 'tutor_dataset_mike', 'curriculum_class_1_to_5.json');
const middlePath = path.join(rootDir, 'knowledge_base', 'tutor_dataset_mike', 'curriculum_class_6_to_8.json');

const nurseryData = JSON.parse(fs.readFileSync(nurseryPath, 'utf8'));
const primaryData = JSON.parse(fs.readFileSync(primaryPath, 'utf8'));
const middleData = JSON.parse(fs.readFileSync(middlePath, 'utf8'));

assert(validateCurriculumSchema(nurseryData, "Nursery Prod").valid, "Prod Verification [Nursery Curriculum]: Passed schema validation");
assert(validateCurriculumSchema(primaryData, "Primary Prod").valid, "Prod Verification [Primary Curriculum]: Passed schema validation");
assert(validateCurriculumSchema(middleData, "Middle Prod").valid, "Prod Verification [Middle Curriculum]: Passed schema validation");

console.log("\n=========================================================================");
console.log(`CURRICULUM STRESS TEST SUMMARY: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
console.log("=========================================================================");

if (failedTests > 0) {
  process.exit(1);
}
