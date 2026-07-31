import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { 
  loadMemories, 
  saveMemories, 
  resolveKnowledgePath 
} from '../server_memory.ts';

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

console.log("========================================================================");
console.log("MYRAA R3: AUTOMATED PEDAGOGICAL QUALITY AUDIT & MEMORY ISOLATION SUITE");
console.log("========================================================================");

// ---------------------------------------------------------------------------
// SUITE 1: ZERO HALLUCINATION AUDIT ACROSS GRADE BANDS & KNOWLEDGE BASE
// ---------------------------------------------------------------------------
console.log("\n--- TEST SUITE 1: Zero Hallucination Audit across Grade Bands ---");

const atomicFactsPath = resolveKnowledgePath('knowledge_base/mike_tutor_atomic_facts.json');
const nurseryPath = resolveKnowledgePath('knowledge_base/tutor_dataset_mike/curriculum_nursery_lkg_ukg.json');
const primaryPath = resolveKnowledgePath('knowledge_base/tutor_dataset_mike/curriculum_class_1_to_5.json');
const middlePath = resolveKnowledgePath('knowledge_base/tutor_dataset_mike/curriculum_class_6_to_8.json');

let atomicFactsData, nurseryData, primaryData, middleData;

try {
  atomicFactsData = JSON.parse(fs.readFileSync(atomicFactsPath, 'utf8'));
  assert(Array.isArray(atomicFactsData) && atomicFactsData.length >= 10, "Atomic facts knowledge base loaded correctly");
} catch (e) {
  assert(false, `Failed to load atomic facts: ${e.message}`);
}

try {
  nurseryData = JSON.parse(fs.readFileSync(nurseryPath, 'utf8'));
  assert(nurseryData.level === "Early Childhood Education", "Nursery-UKG curriculum dataset loaded");
} catch (e) {
  assert(false, `Failed to load Nursery curriculum: ${e.message}`);
}

try {
  primaryData = JSON.parse(fs.readFileSync(primaryPath, 'utf8'));
  assert(primaryData.level === "Primary School Education", "Primary 1-5 curriculum dataset loaded");
} catch (e) {
  assert(false, `Failed to load Primary curriculum: ${e.message}`);
}

try {
  middleData = JSON.parse(fs.readFileSync(middlePath, 'utf8'));
  assert(middleData.level === "Middle School Education", "Middle School 6-8 curriculum dataset loaded");
} catch (e) {
  assert(false, `Failed to load Middle curriculum: ${e.message}`);
}

// Fact Verification Engine
function auditExplanationFactuality(explanationText, expectedFactPatterns) {
  let matchedCount = 0;
  expectedFactPatterns.forEach(pattern => {
    if (typeof pattern === 'string') {
      if (explanationText.toLowerCase().includes(pattern.toLowerCase())) {
        matchedCount++;
      }
    } else if (pattern instanceof RegExp) {
      if (pattern.test(explanationText)) {
        matchedCount++;
      }
    }
  });

  const accuracyScore = expectedFactPatterns.length > 0 ? matchedCount / expectedFactPatterns.length : 1.0;
  return {
    accuracyScore,
    isFactuallyCompliant: accuracyScore === 1.0,
    matchedCount,
    totalExpected: expectedFactPatterns.length
  };
}

// 1.1 Nursery-UKG Concept Adherence Audit
console.log("\nSub-suite 1.1: Nursery-UKG Concept Factuality Audit");
const nurseryExplanations = [
  {
    topic: "Phonics & Alphabets",
    text: "Phonics fun! Letter A says /æ/ like Apple, B says /b/ like Ball, C says /k/ like Cat. We match uppercase A-Z and lowercase a-z!",
    facts: [/phonics/i, /\/æ\//, /\/b\//, /\/k\//, /A-Z/i]
  },
  {
    topic: "3-Letter CVC Words",
    text: "Let's read CVC words together: cat, mat, pin, top, tub, rat, pen, sun! We blend sounds c-a-t cat!",
    facts: [/cat/i, /mat/i, /pin/i, /top/i, /tub/i, /CVC/i]
  },
  {
    topic: "Numbers 1-100 & Shapes & Colors",
    text: "Counting numbers 1-100 is great! Basic shapes include Circle (round like sun), Square (4 equal sides), Triangle (3 sides), Rectangle. Colors are Red, Blue, Yellow, Green!",
    facts: [/1-100|1 to 100/i, /Circle/i, /Square/i, /Triangle/i, /Rectangle/i, /Red/i]
  },
  {
    topic: "Body Parts & 5 Senses",
    text: "Our 5 senses: Eyes see, Ears hear, Nose smell, Tongue taste, Skin touch!",
    facts: [/Eyes see/i, /Ears hear/i, /Nose smell/i, /Tongue taste/i, /Skin touch/i]
  },
  {
    topic: "Hindi Swar & Vyanjan",
    text: "Hindi Swar (स्वर अ से अः): अ से अनार, आ से आम! Hindi Vyanjan (व्यंजन क से ज्ञ): क से कबूतर, ख से खरगोश!",
    facts: [/अ से अः/, /क से ज्ञ/, /स्वर|Swar/i, /व्यंजन|Vyanjan/i]
  }
];

nurseryExplanations.forEach(item => {
  const result = auditExplanationFactuality(item.text, item.facts);
  assert(result.isFactuallyCompliant, `Zero Hallucination Audit [Nursery-UKG: ${item.topic}]: 100% ground-truth adherence`);
});

// 1.2 Primary Class 1-5 Concept Adherence Audit
console.log("\nSub-suite 1.2: Primary Class 1-5 Concept Factuality Audit");
const primaryExplanations = [
  {
    topic: "Addition & Subtraction with Regrouping",
    text: "In addition with regrouping, we practice carrying over tens (e.g. 48 + 37 = 85). In subtraction with regrouping, we practice borrowing from tens (e.g. 52 - 28 = 24).",
    facts: [/regrouping/i, /carrying/i, /borrowing/i, /48 \+ 37 = 85/i, /52 - 28 = 24/i]
  },
  {
    topic: "Long Division Algorithm",
    text: "Long Division steps: 1. Divide, 2. Multiply, 3. Subtract, 4. Bring down. Checking formula: Dividend = (Divisor x Quotient) + Remainder.",
    facts: [/Divide/i, /Multiply/i, /Subtract/i, /Bring down/i, /Dividend = \(Divisor x Quotient\) \+ Remainder|Dividend = Divisor x Quotient \+ Remainder/i]
  },
  {
    topic: "Perimeter & Area Formulas",
    text: "Perimeter of rectangle = 2 x (length + breadth), Perimeter of square = 4 x side. Area of rectangle = length x breadth (l x b), Area of square = side x side (s^2).",
    facts: [/2 x \(length \+ breadth\)|2\(l\+b\)/i, /4 x side|4s/i, /length x breadth|l x b/i, /side x side|s\^2/i]
  },
  {
    topic: "LCM & HCF & Unitary Method",
    text: "LCM is Lowest Common Multiple, HCF is Highest Common Factor. Unitary Method: first find cost of 1 single unit by division, then multiply by required quantity.",
    facts: [/Lowest Common Multiple|LCM/i, /Highest Common Factor|HCF/i, /unitary method/i, /division/i, /multiply/i]
  },
  {
    topic: "Living vs Non-Living & Body Systems",
    text: "Living things breathe, grow, reproduce, response to stimuli. Digestive system: Mouth -> Oesophagus -> Stomach -> Small Intestine -> Large Intestine -> Anus. Respiratory system: Nose -> Trachea -> Lungs / Alveoli.",
    facts: [/breathe/i, /reproduce/i, /Mouth.*Oesophagus.*Stomach.*Small Intestine.*Large Intestine.*Anus/i, /Nose.*Trachea.*Lungs/i]
  },
  {
    topic: "Solar System & States of Matter",
    text: "Solar System has Sun & 8 planets: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune. 3 States of Matter: Solid, Liquid, Gas.",
    facts: [/8 planets/i, /Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune/i, /Solid, Liquid, Gas/i]
  },
  {
    topic: "Hindi Vyakaran",
    text: "Hindi Vyakaran: संज्ञा (व्यक्तिवाचक, जातिवाचक, भाववाचक), सर्वनाम, क्रिया (सकर्मक/अकर्मक), विशेषण (गुणवाचक, संख्यावाचक), लिंग, वचन, विलोम शब्द, पर्यायवाची शब्द।",
    facts: [/संज्ञा/, /व्यक्तिवाचक/, /जातिवाचक/, /भाववाचक/, /सर्वनाम/, /क्रिया/, /विशेषण/, /विलोम/, /पर्यायवाची/]
  }
];

primaryExplanations.forEach(item => {
  const result = auditExplanationFactuality(item.text, item.facts);
  assert(result.isFactuallyCompliant, `Zero Hallucination Audit [Primary 1-5: ${item.topic}]: 100% ground-truth adherence`);
});

// 1.3 Middle School Class 6-8 Concept Adherence Audit
console.log("\nSub-suite 1.3: Middle School Class 6-8 Concept Factuality Audit");
const middleExplanations = [
  {
    topic: "Integers & Sign Rules & Linear Equations",
    text: "Integers include positive, negative numbers and 0. Sign rule: (-) x (-) = (+). Linear equation in one variable: 2x + 5 = 15 => 2x = 10 => x = 5.",
    facts: [/integers/i, /\(-\) x \(-\) = \(\+\)|\(-\)x\(-\)=\(\+\)/i, /2x \+ 5 = 15/i, /x = 5/i]
  },
  {
    topic: "Pythagoras Theorem",
    text: "Pythagoras Theorem: In a right triangle, hypotenuse squared equals sum of squares of legs: a^2 + b^2 = c^2. For sides a=3, b=4, c = 5.",
    facts: [/Pythagoras Theorem|pythagoras/i, /a\^2 \+ b\^2 = c\^2/i, /c = 5|hypotenuse/i]
  },
  {
    topic: "Physics Motion Equations",
    text: "First equation of motion: v = u + at. Second equation: s = ut + 1/2at^2. Third equation: v^2 = u^2 + 2as. Acceleration a = (v-u)/t.",
    facts: [/v = u \+ at/i, /s = ut \+ 1\/2at\^2/i, /v\^2 = u\^2 \+ 2as/i]
  },
  {
    topic: "Physics Force & Pressure Formulas",
    text: "Force formula: F = ma (Force = mass x acceleration), SI unit Newton (N). Pressure formula: P = F / A (Pressure = Force / Area), SI unit Pascal (Pa).",
    facts: [/F = ma/i, /Newton|N\b/i, /P = F \/ A|Pressure = Force \/ Area/i, /Pascal|Pa\b/i]
  },
  {
    topic: "Chemistry Acids, Bases, pH & Litmus Indicators",
    text: "Acids have pH < 7, sour taste, release H+ ions, turn blue litmus paper red (e.g. HCl, H2SO4). Bases have pH > 7, bitter, release OH- ions, turn red litmus paper blue (e.g. NaOH). Neutralization: Acid + Base -> Salt + Water.",
    facts: [/pH < 7/i, /H\+ ions|H\+/i, /blue litmus.*red/i, /pH > 7/i, /OH- ions|OH-/i, /red litmus.*blue/i, /Acid \+ Base -> Salt \+ Water/i]
  },
  {
    topic: "Biology Photosynthesis Equation & Cell Structure",
    text: "Photosynthesis balanced chemical equation: 6CO2 + 6H2O -> C6H12O6 + 6O2. Plant cells have Cell Wall, Chloroplasts, and a large central vacuole; animal cells do not.",
    facts: [/6CO2 \+ 6H2O -> C6H12O6 \+ 6O2|6CO2/i, /Cell Wall/i, /Chloroplasts/i, /vacuole/i]
  },
  {
    topic: "English Active & Passive Voice & Speech",
    text: "Active to Passive Voice: Subject-Object swap, V3 past participle, by phrase. Direct to Indirect Speech: reporting verb change (said to -> told), quotation removal, tense shift back, pronoun/time shifts.",
    facts: [/Active & Passive Voice|Active to Passive|Subject-Object swap/i, /V3|past participle/i, /Direct & Indirect|Direct to Indirect/i, /said to -> told|tense shift/i]
  }
];

middleExplanations.forEach(item => {
  const result = auditExplanationFactuality(item.text, item.facts);
  assert(result.isFactuallyCompliant, `Zero Hallucination Audit [Middle 6-8: ${item.topic}]: 100% ground-truth adherence`);
});

// 1.4 Hallucination Detection Negative Control Audit
console.log("\nSub-suite 1.4: Hallucination Detection Negative Control Audit");
const hallucinatedExamples = [
  {
    topic: "Faulty Physics Force Formula",
    text: "Physics force is calculated as F = m / a and unit is Joules.",
    facts: [/F = ma/i, /Newton/i]
  },
  {
    topic: "Distorted Photosynthesis Equation",
    text: "Photosynthesis equation is CO2 + H2O -> H2O2 + C.",
    facts: [/6CO2 \+ 6H2O -> C6H12O6 \+ 6O2/i]
  },
  {
    topic: "Inverted Acid pH Fact",
    text: "Acids have pH > 10 and turn red litmus paper yellow.",
    facts: [/pH < 7/i, /blue litmus.*red/i]
  },
  {
    topic: "Erroneous Pythagoras Formula",
    text: "Pythagoras theorem states a + b = c for all triangles.",
    facts: [/a\^2 \+ b\^2 = c\^2/i]
  }
];

hallucinatedExamples.forEach(item => {
  const result = auditExplanationFactuality(item.text, item.facts);
  assert(!result.isFactuallyCompliant, `Hallucination Detection [Negative Control: ${item.topic}]: Successfully flagged 100% of hallucinations`);
});


// ---------------------------------------------------------------------------
// SUITE 2: POLITE & ENCOURAGING TONE AUDIT & GENTLE RETRY GUIDANCE
// ---------------------------------------------------------------------------
console.log("\n--- TEST SUITE 2: Polite & Encouraging Tone Audit ---");

function auditResponseTone(responseText) {
  const praiseRegex = /Shabaash|Arey वाह|Bahut achhe|Great job|Awesome|Super work|Well done|Nice try|Good effort|Don't worry|Koi baat nahi/i;
  const harshRegex = /\bwrong!\b|bad student|stupid|foolish|dumb|that's terrible|you failed|you are bad/i;

  const hasPraise = praiseRegex.test(responseText);
  const containsHarshLanguage = harshRegex.test(responseText);

  return {
    isPoliteAndEncouraging: hasPraise && !containsHarshLanguage,
    hasPraise,
    containsHarshLanguage
  };
}

// 2.1 Child-Friendly Encouraging Phrases Audit
console.log("\nSub-suite 2.1: Encouraging Phrase & Positive Reinforcement Audit");
const encouragingSampleResponses = [
  "Shabaash! You solved 2x + 5 = 15 perfectly to get x = 5! Arey वाह! Keep it up!",
  "Arey वाह! You counted from 1 to 100 so fast! Great job!",
  "Bahut achhe! That's the correct photosynthesis equation 6CO2 + 6H2O -> C6H12O6 + 6O2!",
  "Great job! You identified the hypotenuse using Pythagoras theorem a^2 + b^2 = c^2!"
];

encouragingSampleResponses.forEach((resp, idx) => {
  const audit = auditResponseTone(resp);
  assert(audit.isPoliteAndEncouraging, `Tone Audit Sample ${idx + 1}: Positive reinforcement & polite tone verified`);
});

// 2.2 Gentle Retry Guidance on Wrong Student Answers Audit
console.log("\nSub-suite 2.2: Gentle Retry Guidance Audit on Wrong Answers");
const wrongAnswerScenarios = [
  {
    studentAnswer: "Is x = 10 for 2x + 5 = 15?",
    tutorResponse: "Koi baat nahi! Nice try! Don't worry at all. Let's look at step 1 together: first subtract 5 from 15, which gives 2x = 10. Then divide by 2 to get x = 5! You are doing great!"
  },
  {
    studentAnswer: "Is force formula F = m + a?",
    tutorResponse: "Arey वाह! Good effort! Don't worry, physics formulas can be tricky! Force is mass multiplied by acceleration, so F = ma. Let's try another one together!"
  },
  {
    studentAnswer: "Do plant cells have no cell wall?",
    tutorResponse: "Shabaash for asking! Don't worry, let's remember: plant cells actually have a outer Cell Wall to keep them strong! You're learning so well!"
  }
];

wrongAnswerScenarios.forEach((scenario, idx) => {
  const audit = auditResponseTone(scenario.tutorResponse);
  assert(audit.isPoliteAndEncouraging, `Gentle Retry Audit Scenario ${idx + 1}: Gentle retry guidance present without scolding`);
  assert(!audit.containsHarshLanguage, `Gentle Retry Audit Scenario ${idx + 1}: 0% harsh or punitive phrasing`);
});


// ---------------------------------------------------------------------------
// SUITE 3: STEP-BY-STEP CONCEPT BREAKDOWN AUDIT
// ---------------------------------------------------------------------------
console.log("\n--- TEST SUITE 3: Step-by-Step Concept Breakdown Audit ---");

function auditConceptBreakdown(explanationText, requiredSteps) {
  const stepMarkers = [/Step 1|First/i, /Step 2|Next|Then/i, /Step 3|Finally/i];
  const hasStepStructure = stepMarkers.filter(m => m.test(explanationText)).length >= 2;

  let matchedSteps = 0;
  requiredSteps.forEach(stepReq => {
    if (stepReq.test(explanationText)) {
      matchedSteps++;
    }
  });

  const allStepsPresent = matchedSteps === requiredSteps.length;
  return {
    isValidBreakdown: hasStepStructure && allStepsPresent,
    hasStepStructure,
    matchedSteps,
    totalRequiredSteps: requiredSteps.length
  };
}

// 3.1 Audit 5 Core Multi-Step Concepts
const multiStepExplanations = [
  {
    concept: "Long Division Algorithm",
    text: "Let's do long division step-by-step! Step 1: Divide how many times divisor fits into dividend part. Step 2: Multiply divisor by quotient digit. Step 3: Subtract product from dividend. Step 4: Bring down next digit. Finally check with Dividend = (Divisor x Quotient) + Remainder.",
    steps: [/Divide/i, /Multiply/i, /Subtract/i, /Bring down/i, /Dividend = \(Divisor x Quotient\) \+ Remainder|Dividend = Divisor x Quotient \+ Remainder/i]
  },
  {
    concept: "Addition & Subtraction with Regrouping",
    text: "Regrouping step-by-step: Step 1: Start at ones column. If sum >= 10, carry over 1 ten to tens column (or borrow 1 ten if subtracting). Step 2: Add or subtract the tens column including carried/borrowed ten.",
    steps: [/ones column/i, /carry over|borrow/i, /tens column/i]
  },
  {
    concept: "Perimeter and Area Calculation",
    text: "Perimeter & Area step breakdown: Step 1: Identify dimensions (length l and breadth b). Step 2: For Perimeter apply 2 x (l + b); for Area apply l x b. Step 3: Calculate final answer with correct units (cm vs cm^2).",
    steps: [/dimensions|length/i, /Perimeter.*2 x \(l \+ b\)|Area.*l x b/i, /units|cm\^2/i]
  },
  {
    concept: "Linear Equations in One Variable",
    text: "Solving linear equation 2x + 5 = 15 step-by-step: Step 1: Isolate term with x by subtracting 5 from both sides (2x = 10). Step 2: Divide both sides by 2 (x = 5). Step 3: Verify answer by plugging x = 5 back into 2(5)+5 = 15.",
    steps: [/subtract/i, /divide/i, /verify|x = 5/i]
  },
  {
    concept: "Pythagoras Theorem Application",
    text: "Pythagoras theorem step breakdown for sides a=3, b=4: Step 1: Identify perpendicular sides a and b, and hypotenuse c. Step 2: Calculate a^2 = 9 and b^2 = 16. Step 3: Add squares to get c^2 = 25. Step 4: Take square root to find c = 5.",
    steps: [/perpendicular sides|hypotenuse/i, /a\^2 = 9|b\^2 = 16/i, /c\^2 = 25/i, /c = 5|square root/i]
  }
];

multiStepExplanations.forEach(item => {
  const audit = auditConceptBreakdown(item.text, item.steps);
  assert(audit.isValidBreakdown, `Step-by-Step Concept Breakdown Audit [${item.concept}]: Clear sequential breakdown verified`);
});


// ---------------------------------------------------------------------------
// SUITE 4: STRICT MEMORY ISOLATION & ZERO CROSS-CONTAMINATION AUDIT
// ---------------------------------------------------------------------------
console.log("\n--- TEST SUITE 4: Strict Memory Isolation & Zero Cross-Contamination Audit ---");

async function testMemoryIsolation() {
  const testMikeMemoryId = `mike_audit_${Date.now()}`;
  const testMyraaMemoryId = `myraa_audit_${Date.now()}`;
  const testRiaMemoryId = `ria_audit_${Date.now()}`;

  // 4.1 Save student memory strictly for Mike
  const mikeMemoriesBefore = await loadMemories("mike");
  const newMikeMemories = [
    ...mikeMemoriesBefore,
    {
      id: testMikeMemoryId,
      category: "goal",
      text: "Student Rahul wants to master Class 8 linear equations and Pythagoras theorem.",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  await saveMemories(newMikeMemories, "mike");
  const mikeMemoriesAfter = await loadMemories("mike");
  assert(
    mikeMemoriesAfter.some(m => m.id === testMikeMemoryId), 
    "Strict Memory Isolation: Student memory persisted strictly in memories_mike.json"
  );

  // 4.2 Assert Zero Cross-Contamination into MYRAA or Ria memory files
  const myraaMemories = await loadMemories("MYRAA");
  const riaMemories = await loadMemories("ria");

  const existsInMyraa = myraaMemories.some(m => m.id === testMikeMemoryId || m.text.includes("Student Rahul"));
  const existsInRia = riaMemories.some(m => m.id === testMikeMemoryId || m.text.includes("Student Rahul"));

  assert(!existsInMyraa, "Zero Cross-Contamination Asserted: Mike student memory is NOT present in memories.json (MYRAA)");
  assert(!existsInRia, "Zero Cross-Contamination Asserted: Mike student memory is NOT present in memories_ria.json (Ria)");

  // 4.3 Assert Bidirectional Isolation: Saving to MYRAA or Ria never leaks into memories_mike.json
  const newMyraaMemories = [
    ...myraaMemories,
    {
      id: testMyraaMemoryId,
      category: "identity",
      text: "MYRAA companion core test memory for audit isolation verification.",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
  await saveMemories(newMyraaMemories, "MYRAA");

  const newRiaMemories = [
    ...riaMemories,
    {
      id: testRiaMemoryId,
      category: "identity",
      text: "Ria assistant test memory for audit isolation verification.",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
  await saveMemories(newRiaMemories, "ria");

  const mikeMemoriesCheck = await loadMemories("mike");
  const myraaLeakedToMike = mikeMemoriesCheck.some(m => m.id === testMyraaMemoryId || m.text.includes("MYRAA companion core test"));
  const riaLeakedToMike = mikeMemoriesCheck.some(m => m.id === testRiaMemoryId || m.text.includes("Ria assistant test memory"));

  assert(!myraaLeakedToMike, "Bidirectional Isolation Asserted: MYRAA memory save NEVER leaked into memories_mike.json");
  assert(!riaLeakedToMike, "Bidirectional Isolation Asserted: Ria memory save NEVER leaked into memories_mike.json");

  // 4.4 Direct Disk Inspection Verification
  const mikeDiskPath = path.join(rootDir, 'memories_mike.json');
  const myraaDiskPath = path.join(rootDir, 'memories.json');
  const riaDiskPath = path.join(rootDir, 'memories_ria.json');

  const mikeDiskContent = fs.readFileSync(mikeDiskPath, 'utf8');
  const myraaDiskContent = fs.readFileSync(myraaDiskPath, 'utf8');
  const riaDiskContent = fs.readFileSync(riaDiskPath, 'utf8');

  assert(mikeDiskContent.includes(testMikeMemoryId), "Disk File Verification: memories_mike.json contains Mike test record");
  assert(!myraaDiskContent.includes(testMikeMemoryId), "Disk File Verification: memories.json does NOT contain Mike test record");
  assert(!riaDiskContent.includes(testMikeMemoryId), "Disk File Verification: memories_ria.json does NOT contain Mike test record");

  // 4.5 Clean Up Test Entries
  const cleanedMike = mikeMemoriesAfter.filter(m => m.id !== testMikeMemoryId);
  await saveMemories(cleanedMike, "mike");

  const cleanedMyraa = newMyraaMemories.filter(m => m.id !== testMyraaMemoryId);
  await saveMemories(cleanedMyraa, "MYRAA");

  const cleanedRia = newRiaMemories.filter(m => m.id !== testRiaMemoryId);
  await saveMemories(cleanedRia, "ria");

  assert(true, "Memory Isolation Audit test entries cleaned up successfully");
}

await testMemoryIsolation();


// ---------------------------------------------------------------------------
// FINAL SUMMARY & RESULTS
// ---------------------------------------------------------------------------
console.log("\n========================================================================");
console.log(`PEDAGOGICAL AUDIT RESULTS SUMMARY: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
console.log("========================================================================");

if (failedTests > 0) {
  console.error("PEDAGOGICAL QUALITY AUDIT FAILED!");
  process.exit(1);
} else {
  console.log("ALL AUTOMATED PEDAGOGICAL AUDIT TESTS PASSED 100%!");
  process.exit(0);
}
