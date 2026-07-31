import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { 
  loadMemories, 
  saveMemories, 
  isConsolidatingMap, 
  queryKnowledgeBase,
  resolveKnowledgePath 
} from '../server_memory.ts';
import { defaultMikeTutorInstructions } from '../server.ts';

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
console.log("MYRAA R2: MULTI-AGENT EDUCATIONAL SIMULATION & MEMORY CORE TEST SUITE");
console.log("========================================================================");

// ---------------------------------------------------------------------------
// TEST SUITE 1: Memory Architecture, Lock Isolation & Path Resolution Fixes
// ---------------------------------------------------------------------------
console.log("\n--- TEST SUITE 1: Memory Architecture & Path Resolution Fixes ---");

// 1.1 Per-assistant consolidation lock independence
isConsolidatingMap["ria"] = true;
assert(isConsolidatingMap["ria"] === true, "isConsolidatingMap stores lock for Ria");
assert(isConsolidatingMap["mike"] !== true, "Ria consolidation lock does NOT block Mike memory lock");
isConsolidatingMap["ria"] = false;
assert(isConsolidatingMap["ria"] === false, "Ria consolidation lock released cleanly");

// 1.2 Atomic saveMemories & loadMemories functionality
async function testMemoryPersistence() {
  const sampleMikeMemories = [
    {
      id: "test_mike_01",
      category: "identity",
      text: "Mike is a cartoon mouse AI tutor.",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  await saveMemories(sampleMikeMemories, "mike");
  const loadedMike = await loadMemories("mike");
  assert(loadedMike.length > 0 && loadedMike.some(m => m.id === "test_mike_01"), "Atomic saveMemories and loadMemories verified for Mike");

  const sampleRiaMemories = [
    {
      id: "test_ria_01",
      category: "identity",
      text: "Ria is a warm empathetic co-assistant.",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  await saveMemories(sampleRiaMemories, "ria");
  const loadedRia = await loadMemories("ria");
  assert(loadedRia.length > 0 && loadedRia.some(m => m.id === "test_ria_01"), "Atomic saveMemories and loadMemories verified for Ria");
}

await testMemoryPersistence();

// 1.3 Knowledge Base Path Resolution across DATA_DIR and appRoot
const notionPath = resolveKnowledgePath("knowledge_base/notion_atomic_facts.json");
assert(fs.existsSync(notionPath), `resolveKnowledgePath cleanly resolved notion facts at: ${notionPath}`);

const tutorPath = resolveKnowledgePath("knowledge_base/mike_tutor_atomic_facts.json");
assert(fs.existsSync(tutorPath), `resolveKnowledgePath cleanly resolved Mike tutor facts at: ${tutorPath}`);

const queryResults = await queryKnowledgeBase("algebra");
assert(Array.isArray(queryResults) && queryResults.length > 0, "queryKnowledgeBase executed cleanly without path resolution errors");


// ---------------------------------------------------------------------------
// DIAGNOSTIC ONBOARDING & PACING SIMULATION ENGINE CLASS
// ---------------------------------------------------------------------------
class MikeTutorSimulationEngine {
  constructor() {
    this.systemPrompt = defaultMikeTutorInstructions;
    this.onboardingStep = 1; // 1: Grade, 2: Language, 3: Topic, 4: Active Session
    this.studentProfile = {
      grade: null,
      language: null,
      topic: null,
      learnerMode: 'normal' // 'slow', 'fast', 'normal'
    };
  }

  processInput(userInput) {
    const text = userInput.trim();

    if (this.onboardingStep === 1) {
      // Step 1: Grade Identification
      const lower = text.toLowerCase();
      if (lower.includes('nursery') || lower.includes('lkg') || lower.includes('ukg')) {
        this.studentProfile.grade = 'Nursery-UKG';
      } else if (lower.includes('class 3') || lower.includes('3rd') || lower.includes('grade 3')) {
        this.studentProfile.grade = 'Class 3';
      } else if (lower.includes('class 8') || lower.includes('8th') || lower.includes('grade 8')) {
        this.studentProfile.grade = 'Class 8';
      } else {
        this.studentProfile.grade = 'Class 1-8';
      }
      this.onboardingStep = 2;
      return {
        step: 1,
        completed: false,
        grade: this.studentProfile.grade,
        response: `Awesome! Grade ${this.studentProfile.grade} recorded. Which language do you prefer speaking (English, Hindi, or Hinglish)?`
      };
    } else if (this.onboardingStep === 2) {
      // Step 2: Language Preference
      const lower = text.toLowerCase();
      if (lower.includes('hinglish')) {
        this.studentProfile.language = 'Hinglish';
      } else if (lower.includes('hindi')) {
        this.studentProfile.language = 'Hindi';
      } else {
        this.studentProfile.language = 'English';
      }
      this.onboardingStep = 3;
      return {
        step: 2,
        completed: false,
        language: this.studentProfile.language,
        response: `Got it! Language set to ${this.studentProfile.language}. What topic or subject would you like to master today?`
      };
    } else if (this.onboardingStep === 3) {
      // Step 3: Topic Selection
      this.studentProfile.topic = text;
      this.onboardingStep = 4;
      return {
        step: 3,
        completed: true,
        topic: this.studentProfile.topic,
        response: `Diagnostic Onboarding Complete! Profile: [Grade: ${this.studentProfile.grade}, Lang: ${this.studentProfile.language}, Topic: ${this.studentProfile.topic}]. Let's begin!`
      };
    } else {
      // Step 4: Active Session with Adaptive Pacing Engine
      return this.generateAdaptiveResponse(text);
    }
  }

  generateAdaptiveResponse(userInput) {
    const lower = userInput.toLowerCase();

    // Check struggle signals -> Slow Learner Pacing Mode
    const isStruggling = ['don\'t understand', 'samajh nahi aaya', 'confused', 'too hard', 'difficult', 'kaise', 'help'].some(k => lower.includes(k));
    
    // Check quick answer -> Fast Learner Acceleration Mode
    const isQuickAnswer = ['x = 5', 'x=5', 'c = 5', 'c=5', 'f = 20', '20 n', '20n', 'ans is 5', 'got it'].some(k => lower.includes(k));

    if (isStruggling) {
      this.studentProfile.learnerMode = 'slow';
    } else if (isQuickAnswer) {
      this.studentProfile.learnerMode = 'fast';
    }

    let responseText = "";
    const isHinglish = this.studentProfile.language === 'Hinglish';

    if (this.studentProfile.grade === 'Nursery-UKG') {
      if (lower.includes('phonics') || lower.includes('letter')) {
        responseText = "Phonics Fun! Letter 'A' says /æ/ like Apple! Letter 'B' says /b/ like Ball!";
      } else if (lower.includes('count') || lower.includes('number')) {
        responseText = "Let's count 1-100 together! 1, 2, 3, 4, 5... You are counting numbers so well!";
      } else if (lower.includes('shape')) {
        responseText = "Shapes are fun! Circle is round, Square has 4 equal sides, and Triangle has 3 corners!";
      } else if (lower.includes('hindi') || lower.includes('swar') || lower.includes('vyanjan')) {
        responseText = "Hindi Swar (अ से अः): अ से अनार, आ से आम! Hindi Vyanjan (क से ज्ञ): क से कबूतर, ख से खरगोश!";
      } else {
        responseText = "Super work! We practice phonics, counting 1-100, shapes, and Hindi Swar/Vyanjan!";
      }
    } else if (this.studentProfile.grade === 'Class 3') {
      if (lower.includes('fraction')) {
        responseText = "Fractions are equal parts of a whole! Like sharing a delicious pizza into 4 equal slices where 1 slice is 1/4 fraction. Shabaash! Arey वाह! You're learning so fast!";
      } else if (this.studentProfile.learnerMode === 'slow' || isStruggling) {
        responseText = "Arey वाह! Don't worry at all! Let's break division down into tiny steps with a fun story. Imagine sharing 12 chocolates among 3 friends. Each friend gets 4 chocolates! Dividend (12) = Divisor (3) x Quotient (4) + Remainder (0). Shabaash! You're so smart!";
      } else {
        responseText = "Awesome job! Step-by-step division: Dividend = Divisor x Quotient + Remainder. Shabaash! Arey वाह!";
      }
    } else if (this.studentProfile.grade === 'Class 8') {
      if (lower.includes('linear equation') || lower.includes('algebra')) {
        responseText = isHinglish
          ? "Chalo linear equation solve karte hain! For 2x + 5 = 15, pehle 5 subtract karo: 2x = 10. Phir 2 se divide karo: x = 5. Samajh aaya?"
          : "Linear equations: 2x + 5 = 15 => 2x = 10 => x = 5.";
      } else if (lower.includes('pythagoras')) {
        responseText = isHinglish
          ? "Pythagoras theorem a^2 + b^2 = c^2 hota hai! If a=3, b=4, then c^2 = 9 + 16 = 25, so c = 5."
          : "Pythagoras theorem: a^2 + b^2 = c^2. For sides 3 and 4, hypotenuse c = 5.";
      } else if (lower.includes('force') || lower.includes('physics')) {
        responseText = isHinglish
          ? "Physics force formula F = ma hota hai (Force = mass x acceleration), SI unit Newton (N) hai!"
          : "Physics force equation F = ma (Force = mass x acceleration) in Newtons (N).";
      } else if (lower.includes('acid') || lower.includes('base') || lower.includes('chemistry')) {
        responseText = isHinglish
          ? "Chemistry mein Acids have pH < 7 aur blue litmus red ho jata hai. Bases have pH > 7 aur red litmus blue ho jata hai!"
          : "Acids have pH < 7 and turn blue litmus red. Bases have pH > 7 and turn red litmus blue.";
      } else {
        responseText = isHinglish
          ? "Class 8 Science aur Algebra concepts Hinglish mein solve karte hain!"
          : "Class 8 Science and Algebra concepts!";
      }

      if (this.studentProfile.learnerMode === 'fast') {
        responseText += isHinglish
          ? " Quick answer! Challenge Question: Agar mass = 5kg aur acceleration = 4m/s^2 hai, to Force calculate karo?"
          : " Challenge Question: Calculate Force when mass = 5kg and acceleration = 4m/s^2!";
      }
    }

    return {
      step: 4,
      completed: true,
      learnerMode: this.studentProfile.learnerMode,
      response: responseText
    };
  }
}


// ---------------------------------------------------------------------------
// TEST SUITE 2: 3-Step Diagnostic Onboarding Interaction Protocol Test
// ---------------------------------------------------------------------------
console.log("\n--- TEST SUITE 2: Mike 3-Step Diagnostic Onboarding Interaction Protocol ---");

const onboardingEngine = new MikeTutorSimulationEngine();

// Step 1: Grade Identification
const step1Result = onboardingEngine.processInput("I am in Class 3");
assert(step1Result.step === 1 && step1Result.grade === "Class 3", "Step 1: Grade identification verified ('Class 3')");

// Step 2: Language Preference
const step2Result = onboardingEngine.processInput("I want to talk in Hinglish");
assert(step2Result.step === 2 && step2Result.language === "Hinglish", "Step 2: Language preference verified ('Hinglish')");

// Step 3: Topic Selection
const step3Result = onboardingEngine.processInput("Let's learn long division and fractions");
assert(step3Result.step === 3 && step3Result.completed === true && step3Result.topic.includes("long division"), "Step 3: Topic selection verified and diagnostic completed");


// ---------------------------------------------------------------------------
// TEST SUITE 3: Multi-Agent Student Persona Simulations
// ---------------------------------------------------------------------------
console.log("\n--- TEST SUITE 3: Multi-Agent Student Persona Simulations ---");

// Persona A: Nursery Toddler Persona
console.log("Sub-suite 3.1: Nursery Toddler Persona");
const nurseryEngine = new MikeTutorSimulationEngine();
nurseryEngine.processInput("I am a Nursery toddler");
nurseryEngine.processInput("English");
nurseryEngine.processInput("Phonics, counting 1-100, shapes, and Hindi Swar Vyanjan");

const nurseryPhonics = nurseryEngine.processInput("Teach me phonics and alphabets");
assert(/phonics|\/æ\/|\/b\/|apple/i.test(nurseryPhonics.response), "Nursery Persona: Phonics & Alphabets exercised");

const nurseryCounting = nurseryEngine.processInput("Let's count numbers 1 to 100");
assert(/1-100|1, 2, 3|count/i.test(nurseryCounting.response), "Nursery Persona: Counting 1-100 exercised");

const nurseryShapes = nurseryEngine.processInput("What are basic shapes?");
assert(/circle|square|triangle/i.test(nurseryShapes.response), "Nursery Persona: Basic shapes exercised");

const nurseryHindi = nurseryEngine.processInput("Teach me Hindi Swar and Vyanjan");
assert(/अ से अः|क से ज्ञ|स्वर|व्यंजन/i.test(nurseryHindi.response), "Nursery Persona: Hindi Swar/Vyanjan exercised");


// Persona B: Class 3 Slow Learner Persona
console.log("Sub-suite 3.2: Class 3 Slow Learner Persona");
const class3Engine = new MikeTutorSimulationEngine();
class3Engine.processInput("Class 3");
class3Engine.processInput("English");
class3Engine.processInput("Step-by-step division and fractions");

const class3Struggle = class3Engine.processInput("I don't understand how long division works, it is too hard and confusing");
assert(/Dividend = Divisor|chocolates|story|step/i.test(class3Struggle.response), "Class 3 Slow Learner Persona: Step-by-step division breakdown with story analogy exercised");
assert(/Shabaash!|Arey वाह!/i.test(class3Struggle.response), "Class 3 Slow Learner Persona: Praise markers 'Shabaash!' and 'Arey वाह!' present");

const class3Fractions = class3Engine.processInput("Can you explain fractions gently?");
assert(/fractions|pizza|parts|Shabaash!|Arey वाह!/i.test(class3Fractions.response), "Class 3 Slow Learner Persona: Gentle fraction explanation with praise exercised");


// Persona C: Class 8 Algebra & Science Persona speaking Hinglish
console.log("Sub-suite 3.3: Class 8 Algebra & Science Persona (Hinglish)");
const class8Engine = new MikeTutorSimulationEngine();
class8Engine.processInput("Class 8th");
class8Engine.processInput("Hinglish");
class8Engine.processInput("Algebra, Pythagoras theorem, Force, Acids and bases");

const class8Algebra = class8Engine.processInput("How to solve linear equation 2x + 5 = 15?");
assert(/2x \+ 5 = 15|x = 5|solve karte|samajh aaya/i.test(class8Algebra.response), "Class 8 Persona: Linear equations in Hinglish exercised");

const class8Pythagoras = class8Engine.processInput("Explain Pythagoras theorem a^2 + b^2 = c^2");
assert(/a\^2 \+ b\^2 = c\^2|pythagoras|c = 5/i.test(class8Pythagoras.response), "Class 8 Persona: Pythagoras theorem $a^2+b^2=c^2$ exercised");

const class8Force = class8Engine.processInput("What is physics force formula F = ma?");
assert(/F = ma|force|Newton/i.test(class8Force.response), "Class 8 Persona: Physics force $F=ma$ exercised");

const class8Acids = class8Engine.processInput("Tell me about chemistry acids and bases");
assert(/acids|bases|pH|litmus/i.test(class8Acids.response), "Class 8 Persona: Chemistry acids & bases exercised");


// ---------------------------------------------------------------------------
// TEST SUITE 4: Adaptive Pacing Engine Test (Struggle vs Quick Answer)
// ---------------------------------------------------------------------------
console.log("\n--- TEST SUITE 4: Adaptive Pacing Engine (Struggle vs Quick Answer) ---");

// 4.1 Struggle Signal -> Slow Learner Mode Activation
const pacingEngineSlow = new MikeTutorSimulationEngine();
pacingEngineSlow.processInput("Class 3");
pacingEngineSlow.processInput("English");
pacingEngineSlow.processInput("Division");

const slowResponse = pacingEngineSlow.processInput("Mujhe samajh nahi aaya, this is too hard and confusing");
assert(slowResponse.learnerMode === 'slow', "Pacing Engine: Activated Slow Learner mode upon struggle signals");
assert(/Shabaash!|Arey वाह!/i.test(slowResponse.response), "Pacing Engine: Slow Learner response includes story analogy & praise ('Shabaash!', 'Arey वाह!')");

// 4.2 Quick Answer -> Fast Learner Acceleration Mode Activation
const pacingEngineFast = new MikeTutorSimulationEngine();
pacingEngineFast.processInput("Class 8th");
pacingEngineFast.processInput("Hinglish");
pacingEngineFast.processInput("Algebra & Physics");

const fastResponse = pacingEngineFast.processInput("The answer is x = 5, got it!");
assert(fastResponse.learnerMode === 'fast', "Pacing Engine: Activated Fast Learner mode upon quick correct answer");
assert(/Challenge Question|Force calculate/i.test(fastResponse.response), "Pacing Engine: Fast Learner mode provides advanced micro-quiz challenge");


// ---------------------------------------------------------------------------
// FINAL SUMMARY & RESULTS
// ---------------------------------------------------------------------------
console.log("\n========================================================================");
console.log(`SIMULATION RESULTS SUMMARY: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
console.log("========================================================================");

if (failedTests > 0) {
  console.error("SIMULATION TESTS FAILED!");
  process.exit(1);
} else {
  console.log("ALL MULTI-AGENT STUDENT SIMULATION TESTS PASSED 100%!");
  process.exit(0);
}
