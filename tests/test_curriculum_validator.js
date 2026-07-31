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

console.log("=================================================");
console.log("MYRAA CURRICULUM & ATOMIC FACTS VALIDATOR TEST");
console.log("=================================================");

const nurseryPath = path.join(rootDir, 'knowledge_base', 'tutor_dataset_mike', 'curriculum_nursery_lkg_ukg.json');
const primaryPath = path.join(rootDir, 'knowledge_base', 'tutor_dataset_mike', 'curriculum_class_1_to_5.json');
const middlePath = path.join(rootDir, 'knowledge_base', 'tutor_dataset_mike', 'curriculum_class_6_to_8.json');
const atomicFactsPath = path.join(rootDir, 'knowledge_base', 'mike_tutor_atomic_facts.json');

// 1. File existence & JSON schema validation
console.log("\n--- TEST SUITE 1: JSON Schema & File Integrity ---");

let nurseryData, primaryData, middleData, atomicFactsData;

try {
  nurseryData = JSON.parse(fs.readFileSync(nurseryPath, 'utf8'));
  assert(true, `Loaded ${path.basename(nurseryPath)}`);
} catch (e) {
  assert(false, `Failed to load ${path.basename(nurseryPath)}: ${e.message}`);
}

try {
  primaryData = JSON.parse(fs.readFileSync(primaryPath, 'utf8'));
  assert(true, `Loaded ${path.basename(primaryPath)}`);
} catch (e) {
  assert(false, `Failed to load ${path.basename(primaryPath)}: ${e.message}`);
}

try {
  middleData = JSON.parse(fs.readFileSync(middlePath, 'utf8'));
  assert(true, `Loaded ${path.basename(middlePath)}`);
} catch (e) {
  assert(false, `Failed to load ${path.basename(middlePath)}: ${e.message}`);
}

try {
  atomicFactsData = JSON.parse(fs.readFileSync(atomicFactsPath, 'utf8'));
  assert(true, `Loaded ${path.basename(atomicFactsPath)}`);
} catch (e) {
  assert(false, `Failed to load ${path.basename(atomicFactsPath)}: ${e.message}`);
}

function validateCurriculumSchema(data, name) {
  assert(typeof data.level === 'string', `${name}: 'level' is string`);
  assert(Array.isArray(data.grades) && data.grades.length > 0, `${name}: 'grades' is non-empty array`);
  assert(Array.isArray(data.modules) && data.modules.length > 0, `${name}: 'modules' is non-empty array`);
  
  let validTopicsCount = 0;
  data.modules.forEach((mod, mIdx) => {
    assert(typeof mod.subject === 'string' && mod.subject.length > 0, `${name} Module [${mIdx}]: 'subject' string present`);
    assert(Array.isArray(mod.topics) && mod.topics.length > 0, `${name} Module [${mIdx}]: 'topics' array present`);
    mod.topics.forEach(t => {
      if (t.title && t.content && (t.pedagogy_tip || t.explanation_strategy)) {
        validTopicsCount++;
      }
    });
  });
  assert(validTopicsCount > 0, `${name}: Valid topics structure present (${validTopicsCount} topics found)`);
}

validateCurriculumSchema(nurseryData, "Nursery-UKG Curriculum");
validateCurriculumSchema(primaryData, "Class 1-5 Curriculum");
validateCurriculumSchema(middleData, "Class 6-8 Curriculum");

assert(Array.isArray(atomicFactsData) && atomicFactsData.length >= 10, "Atomic Facts Store: array with >= 10 facts");

// 2. Comprehensive Topic Presence Verification across Grade Bands
console.log("\n--- TEST SUITE 2: Grade Band Required Topic Verification ---");

const allCurriculumText = [
  JSON.stringify(nurseryData),
  JSON.stringify(primaryData),
  JSON.stringify(middleData),
  JSON.stringify(atomicFactsData)
].join("\n");

// Nursery, LKG, UKG requirements
const nurseryReqs = [
  { name: "Phonics", match: /phonics/i },
  { name: "A-Z letters", match: /A for Apple|A-Z/i },
  { name: "CVC words (cat, mat, pin, top, tub)", match: /cat.*mat.*pin.*top.*tub|cat, mat, pin, top, tub/i },
  { name: "Counting 1-100", match: /1-100|1 to 100/i },
  { name: "Basic shapes", match: /Circle|Square|Triangle|Rectangle/i },
  { name: "Colors", match: /Red|Blue|Yellow|Green/i },
  { name: "Animals", match: /Lion|Tiger|Cow|Peacock/i },
  { name: "Body parts & 5 senses", match: /Eyes|Ears|Nose|Tongue|Skin|senses/i },
  { name: "Hindi Swar (अ से अः)", match: /अ से अः|स्वर/i },
  { name: "Hindi Vyanjan (क से ज्ञ)", match: /क से ज्ञ|व्यंजन/i }
];

console.log("Sub-suite 2.1: Nursery, LKG, UKG Topic Verification");
nurseryReqs.forEach(req => {
  assert(req.match.test(allCurriculumText), `Nursery-UKG Requirement Present: ${req.name}`);
});

// Primary Class 1-5 requirements
const primaryReqs = [
  { name: "Addition/subtraction with regrouping", match: /regrouping|carrying|borrowing/i },
  { name: "Multiplication tables 1-10", match: /tables 1 to 10|tables 1-10|tables 2 to 10/i },
  { name: "Long division step-by-step", match: /long division.*step|dividend = \(divisor/i },
  { name: "Fractions", match: /fractions|proper, improper/i },
  { name: "Perimeter and Area", match: /perimeter.*area|2 x \(length \+ breadth\)|side x side/i },
  { name: "LCM & HCF", match: /LCM.*HCF|Lowest Common Multiple/i },
  { name: "Unitary method", match: /unitary method/i },
  { name: "Living vs non-living", match: /living vs non-living|living things/i },
  { name: "Human digestive system & respiratory system", match: /digestive system.*respiratory system|digestive tract|nasal/i },
  { name: "Solar system", match: /solar system|mercury, venus, earth/i },
  { name: "States of matter", match: /states of matter|solid.*liquid.*gas/i },
  { name: "English grammar rules (nouns, pronouns, verbs, tenses)", match: /nouns.*pronouns.*verbs.*tenses/i },
  { name: "Hindi Vyakaran (Sangya, Sarvanam, Kriya, Visheshaan)", match: /संज्ञा.*सर्वनाम.*क्रिया.*विशेषण|Sangya.*Sarvanam/i }
];

console.log("Sub-suite 2.2: Primary Class 1-5 Topic Verification");
primaryReqs.forEach(req => {
  assert(req.match.test(allCurriculumText), `Primary Class 1-5 Requirement Present: ${req.name}`);
});

// Middle School Class 6-8 requirements
const middleReqs = [
  { name: "Integers", match: /integers/i },
  { name: "Linear equations in one variable", match: /linear equations|2x \+ 5 = 15/i },
  { name: "Pythagoras theorem (a^2 + b^2 = c^2)", match: /pythagoras theorem|a\^2 \+ b\^2 = c\^2/i },
  { name: "Exponents & powers", match: /exponents.*powers|a\^m/i },
  { name: "Mensuration", match: /mensuration|trapezium|surface area/i },
  { name: "Physics motion (v = u + at)", match: /motion.*v = u \+ at|rectilinear/i },
  { name: "Physics force (F = ma)", match: /force.*F = m.*a|F = ma/i },
  { name: "Physics pressure", match: /pressure.*F \/ A|pressure = force/i },
  { name: "Chemistry acids, bases, pH & litmus indicators", match: /acids.*bases.*pH.*litmus/i },
  { name: "Biology cell structure", match: /cell structure|cell membrane/i },
  { name: "Biology photosynthesis (6CO2 + 6H2O -> C6H12O6 + 6O2)", match: /photosynthesis.*6CO2 \+ 6H2O -> C6H12O6 \+ 6O2|6CO2/i },
  { name: "Active & Passive voice", match: /active & passive|active to passive/i },
  { name: "Direct & Indirect speech", match: /direct & indirect|direct to indirect/i }
];

console.log("Sub-suite 2.3: Middle School Class 6-8 Topic Verification");
middleReqs.forEach(req => {
  assert(req.match.test(allCurriculumText), `Middle School Class 6-8 Requirement Present: ${req.name}`);
});

// 3. Multilingual Representation Verification
console.log("\n--- TEST SUITE 3: Multilingual Representation (English, Hindi, Hinglish) ---");

const devanagariRegex = /[\u0900-\u097F]/;
const hinglishRegex = /chalo|karte|hain|matlab|kaunsi|samajh|aaya|shabash|शाबाश|फिर से/i;

assert(devanagariRegex.test(allCurriculumText), "Devanagari Hindi script representation verified");
assert(hinglishRegex.test(allCurriculumText), "Hinglish mixed phrase representation verified");
assert(/English Grammar|Pedagogy|Curriculum/i.test(allCurriculumText), "English representation verified");

// Final summary & process exit
console.log("\n=================================================");
console.log(`RESULTS SUMMARY: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
console.log("=================================================");

if (failedTests > 0) {
  console.error("CURRICULUM VALIDATION FAILED!");
  process.exit(1);
} else {
  console.log("ALL CURRICULUM VALIDATION TESTS PASSED 100%!");
  process.exit(0);
}
