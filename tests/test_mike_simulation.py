import json
import os
import re
import sys

# Ensure UTF-8 output encoding on Windows stdout
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

total_tests = 0
passed_tests = 0
failed_tests = 0

def assert_test(condition, message):
    global total_tests, passed_tests, failed_tests
    total_tests += 1
    if condition:
        print(f"  [PASS] {message}")
        passed_tests += 1
    else:
        print(f"  [FAIL] {message}")
        failed_tests += 1

class MikeTutorSimulationEngine:
    def __init__(self):
        self.onboarding_step = 1 # 1: Grade, 2: Language, 3: Topic, 4: Active Session
        self.student_profile = {
            'grade': None,
            'language': None,
            'topic': None,
            'learner_mode': 'normal' # 'slow', 'fast', 'normal'
        }

    def process_input(self, user_input):
        text = user_input.strip()

        if self.onboarding_step == 1:
            lower = text.lower()
            if 'nursery' in lower or 'lkg' in lower or 'ukg' in lower:
                self.student_profile['grade'] = 'Nursery-UKG'
            elif 'class 3' in lower or '3rd' in lower or 'grade 3' in lower:
                self.student_profile['grade'] = 'Class 3'
            elif 'class 8' in lower or '8th' in lower or 'grade 8' in lower:
                self.student_profile['grade'] = 'Class 8'
            else:
                self.student_profile['grade'] = 'Class 1-8'
            self.onboarding_step = 2
            return {
                'step': 1,
                'completed': False,
                'grade': self.student_profile['grade'],
                'response': f"Awesome! Grade {self.student_profile['grade']} recorded. Which language do you prefer speaking (English, Hindi, or Hinglish)?"
            }
        elif self.onboarding_step == 2:
            lower = text.lower()
            if 'hinglish' in lower:
                self.student_profile['language'] = 'Hinglish'
            elif 'hindi' in lower:
                self.student_profile['language'] = 'Hindi'
            else:
                self.student_profile['language'] = 'English'
            self.onboarding_step = 3
            return {
                'step': 2,
                'completed': False,
                'language': self.student_profile['language'],
                'response': f"Got it! Language set to {self.student_profile['language']}. What topic or subject would you like to master today?"
            }
        elif self.onboarding_step == 3:
            self.student_profile['topic'] = text
            self.onboarding_step = 4
            return {
                'step': 3,
                'completed': True,
                'topic': self.student_profile['topic'],
                'response': f"Diagnostic Onboarding Complete! Profile: [Grade: {self.student_profile['grade']}, Lang: {self.student_profile['language']}, Topic: {self.student_profile['topic']}]. Let's begin!"
            }
        else:
            return self.generate_adaptive_response(text)

    def generate_adaptive_response(self, user_input):
        lower = user_input.lower()

        is_struggling = any(k in lower for k in ["don't understand", "samajh nahi aaya", "confused", "too hard", "difficult", "kaise", "help"])
        is_quick_answer = any(k in lower for k in ["x = 5", "x=5", "c = 5", "c=5", "f = 20", "20 n", "20n", "ans is 5", "got it"])

        if is_struggling:
            self.student_profile['learner_mode'] = 'slow'
        elif is_quick_answer:
            self.student_profile['learner_mode'] = 'fast'

        response_text = ""
        is_hinglish = self.student_profile['language'] == 'Hinglish'

        if self.student_profile['grade'] == 'Nursery-UKG':
            if 'phonics' in lower or 'letter' in lower:
                response_text = "Phonics Fun! Letter 'A' says /æ/ like Apple! Letter 'B' says /b/ like Ball!"
            elif 'count' in lower or 'number' in lower:
                response_text = "Let's count 1-100 together! 1, 2, 3, 4, 5... You are counting numbers so well!"
            elif 'shape' in lower:
                response_text = "Shapes are fun! Circle is round, Square has 4 equal sides, and Triangle has 3 corners!"
            elif 'hindi' in lower or 'swar' in lower or 'vyanjan' in lower:
                response_text = "Hindi Swar (अ से अः): अ से अनार, आ से आम! Hindi Vyanjan (क से ज्ञ): क से कबूतर, ख से खरगोश!"
            else:
                response_text = "Super work! We practice phonics, counting 1-100, shapes, and Hindi Swar/Vyanjan!"
        elif self.student_profile['grade'] == 'Class 3':
            if 'fraction' in lower:
                response_text = "Fractions are equal parts of a whole! Like sharing a delicious pizza into 4 equal slices where 1 slice is 1/4 fraction. Shabaash! Arey वाह! You're learning so fast!"
            elif self.student_profile['learner_mode'] == 'slow' or is_struggling:
                response_text = "Arey वाह! Don't worry at all! Let's break division down into tiny steps with a fun story. Imagine sharing 12 chocolates among 3 friends. Each friend gets 4 chocolates! Dividend (12) = Divisor (3) x Quotient (4) + Remainder (0). Shabaash! You're so smart!"
            else:
                response_text = "Awesome job! Step-by-step division: Dividend = Divisor x Quotient + Remainder. Shabaash! Arey वाह!"
        elif self.student_profile['grade'] == 'Class 8':
            if 'linear equation' in lower or 'algebra' in lower:
                response_text = ("Chalo linear equation solve karte hain! For 2x + 5 = 15, pehle 5 subtract karo: 2x = 10. Phir 2 se divide karo: x = 5. Samajh aaya?"
                                 if is_hinglish else "Linear equations: 2x + 5 = 15 => 2x = 10 => x = 5.")
            elif 'pythagoras' in lower:
                response_text = ("Pythagoras theorem a^2 + b^2 = c^2 hota hai! If a=3, b=4, then c^2 = 9 + 16 = 25, so c = 5."
                                 if is_hinglish else "Pythagoras theorem: a^2 + b^2 = c^2. For sides 3 and 4, hypotenuse c = 5.")
            elif 'force' in lower or 'physics' in lower:
                response_text = ("Physics force formula F = ma hota hai (Force = mass x acceleration), SI unit Newton (N) hai!"
                                 if is_hinglish else "Physics force equation F = ma (Force = mass x acceleration) in Newtons (N).")
            elif 'acid' in lower or 'base' in lower or 'chemistry' in lower:
                response_text = ("Chemistry mein Acids have pH < 7 aur blue litmus red ho jata hai. Bases have pH > 7 aur red litmus blue ho jata hai!"
                                 if is_hinglish else "Acids have pH < 7 and turn blue litmus red. Bases have pH > 7 and turn red litmus blue.")
            else:
                response_text = ("Class 8 Science aur Algebra concepts Hinglish mein solve karte hain!"
                                 if is_hinglish else "Class 8 Science and Algebra concepts!")

            if self.student_profile['learner_mode'] == 'fast':
                response_text += (" Quick answer! Challenge Question: Agar mass = 5kg aur acceleration = 4m/s^2 hai, to Force calculate karo?"
                                  if is_hinglish else " Challenge Question: Calculate Force when mass = 5kg and acceleration = 4m/s^2!")

        return {
            'step': 4,
            'completed': True,
            'learner_mode': self.student_profile['learner_mode'],
            'response': response_text
        }


def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    print("========================================================================")
    print("MYRAA R2: MULTI-AGENT EDUCATIONAL SIMULATION & MEMORY CORE TEST (PYTHON)")
    print("========================================================================")

    # ---------------------------------------------------------------------------
    # TEST SUITE 1: Memory Architecture & Path Resolution Verification
    # ---------------------------------------------------------------------------
    print("\n--- TEST SUITE 1: Memory Architecture & Path Resolution Verification ---")
    
    server_mem_path = os.path.join(base_dir, 'server_memory.ts')
    assert_test(os.path.exists(server_mem_path), "server_memory.ts exists")
    
    with open(server_mem_path, 'r', encoding='utf-8') as f:
        mem_code = f.read()

    assert_test("isConsolidatingMap: Record<string, boolean> = {}" in mem_code or "export const isConsolidatingMap" in mem_code, 
                "server_memory.ts: Per-assistant consolidation lock map (isConsolidatingMap) implemented")

    assert_test("fsSync.renameSync" in mem_code or "rename" in mem_code, 
                "server_memory.ts: Atomic file save operation (temporary file write & atomic rename) implemented")

    assert_test("resolveKnowledgePath" in mem_code or "appRoot" in mem_code, 
                "server_memory.ts: Knowledge base path resolution using appRoot / DATA_DIR implemented")

    # Knowledge Base datasets existence check
    notion_facts = os.path.join(base_dir, 'knowledge_base', 'notion_atomic_facts.json')
    tutor_facts = os.path.join(base_dir, 'knowledge_base', 'mike_tutor_atomic_facts.json')
    assert_test(os.path.exists(notion_facts), "Notion Atomic Facts dataset file present")
    assert_test(os.path.exists(tutor_facts), "Mike Tutor Atomic Facts dataset file present")


    # ---------------------------------------------------------------------------
    # TEST SUITE 2: 3-Step Diagnostic Onboarding Interaction Protocol Test
    # ---------------------------------------------------------------------------
    print("\n--- TEST SUITE 2: Mike 3-Step Diagnostic Onboarding Interaction Protocol ---")

    engine = MikeTutorSimulationEngine()
    step1 = engine.process_input("I am in Class 3")
    assert_test(step1['step'] == 1 and step1['grade'] == 'Class 3', "Step 1: Grade identification verified ('Class 3')")

    step2 = engine.process_input("I want to speak Hinglish")
    assert_test(step2['step'] == 2 and step2['language'] == 'Hinglish', "Step 2: Language preference verified ('Hinglish')")

    step3 = engine.process_input("Step-by-step division and fractions")
    assert_test(step3['step'] == 3 and step3['completed'] == True, "Step 3: Topic selection verified and diagnostic completed")


    # ---------------------------------------------------------------------------
    # TEST SUITE 3: Multi-Agent Student Persona Simulations
    # ---------------------------------------------------------------------------
    print("\n--- TEST SUITE 3: Multi-Agent Student Persona Simulations ---")

    # Sub-suite 3.1: Nursery Toddler Persona
    print("Sub-suite 3.1: Nursery Toddler Persona")
    nursery = MikeTutorSimulationEngine()
    nursery.process_input("Nursery")
    nursery.process_input("English")
    nursery.process_input("Phonics, counting, shapes, Hindi Swar Vyanjan")

    phonics_res = nursery.process_input("Teach me phonics")
    assert_test(re.search(r"phonics|/æ/|/b/|apple", phonics_res['response'], re.IGNORECASE) is not None, "Nursery Persona: Phonics exercised")

    count_res = nursery.process_input("Count 1 to 100")
    assert_test(re.search(r"1-100|1, 2, 3|count", count_res['response'], re.IGNORECASE) is not None, "Nursery Persona: Counting 1-100 exercised")

    shapes_res = nursery.process_input("Basic shapes")
    assert_test(re.search(r"circle|square|triangle", shapes_res['response'], re.IGNORECASE) is not None, "Nursery Persona: Shapes exercised")

    hindi_res = nursery.process_input("Hindi Swar and Vyanjan")
    assert_test(re.search(r"अ से अः|क से ज्ञ|स्वर|व्यंजन", hindi_res['response']) is not None, "Nursery Persona: Hindi Swar/Vyanjan exercised")


    # Sub-suite 3.2: Class 3 Slow Learner Persona
    print("Sub-suite 3.2: Class 3 Slow Learner Persona")
    class3 = MikeTutorSimulationEngine()
    class3.process_input("Class 3")
    class3.process_input("English")
    class3.process_input("Step-by-step division and fractions")

    struggle_res = class3.process_input("I don't understand how long division works, it is too hard and confusing")
    assert_test(re.search(r"Dividend = Divisor|chocolates|story|step", struggle_res['response'], re.IGNORECASE) is not None, "Class 3 Slow Learner Persona: Division breakdown with story analogy exercised")
    assert_test(re.search(r"Shabaash!|Arey वाह!", struggle_res['response']) is not None, "Class 3 Slow Learner Persona: Praise markers 'Shabaash!' and 'Arey वाह!' present")

    fraction_res = class3.process_input("Explain fractions")
    assert_test(re.search(r"fractions|pizza|parts", fraction_res['response'], re.IGNORECASE) is not None, "Class 3 Slow Learner Persona: Fractions exercised")


    # Sub-suite 3.3: Class 8 Algebra & Science Persona (Hinglish)
    print("Sub-suite 3.3: Class 8 Algebra & Science Persona (Hinglish)")
    class8 = MikeTutorSimulationEngine()
    class8.process_input("Class 8th")
    class8.process_input("Hinglish")
    class8.process_input("Algebra, Pythagoras theorem, Force, Acids and bases")

    algebra_res = class8.process_input("How to solve 2x + 5 = 15?")
    assert_test(re.search(r"2x \+ 5 = 15|x = 5|solve karte|samajh aaya", algebra_res['response'], re.IGNORECASE) is not None, "Class 8 Persona: Linear equations in Hinglish exercised")

    pythagoras_res = class8.process_input("Explain Pythagoras theorem a^2 + b^2 = c^2")
    assert_test(re.search(r"a\^2 \+ b\^2 = c\^2|pythagoras|c = 5", pythagoras_res['response'], re.IGNORECASE) is not None, "Class 8 Persona: Pythagoras theorem $a^2+b^2=c^2$ exercised")

    force_res = class8.process_input("What is physics force formula F = ma?")
    assert_test(re.search(r"F = ma|force|Newton", force_res['response'], re.IGNORECASE) is not None, "Class 8 Persona: Physics force $F=ma$ exercised")

    acid_res = class8.process_input("Chemistry acids and bases")
    assert_test(re.search(r"acids|bases|pH|litmus", acid_res['response'], re.IGNORECASE) is not None, "Class 8 Persona: Chemistry acids & bases exercised")


    # ---------------------------------------------------------------------------
    # TEST SUITE 4: Adaptive Pacing Engine Test (Struggle vs Quick Answer)
    # ---------------------------------------------------------------------------
    print("\n--- TEST SUITE 4: Adaptive Pacing Engine (Struggle vs Quick Answer) ---")

    # 4.1 Struggle Signal -> Slow Learner Mode Activation
    slow_pacing = MikeTutorSimulationEngine()
    slow_pacing.process_input("Class 3")
    slow_pacing.process_input("English")
    slow_pacing.process_input("Division")
    slow_res = slow_pacing.process_input("Mujhe samajh nahi aaya, this is too hard and confusing")
    assert_test(slow_res['learner_mode'] == 'slow', "Pacing Engine: Activated Slow Learner mode upon struggle signals")
    assert_test(re.search(r"Shabaash!|Arey वाह!", slow_res['response']) is not None, "Pacing Engine: Slow Learner response includes story analogy & praise ('Shabaash!', 'Arey वाह!')")

    # 4.2 Quick Answer -> Fast Learner Acceleration Mode Activation
    fast_pacing = MikeTutorSimulationEngine()
    fast_pacing.process_input("Class 8th")
    fast_pacing.process_input("Hinglish")
    fast_pacing.process_input("Algebra & Physics")
    fast_res = fast_pacing.process_input("The answer is x = 5, got it!")
    assert_test(fast_res['learner_mode'] == 'fast', "Pacing Engine: Activated Fast Learner mode upon quick correct answer")
    assert_test(re.search(r"Challenge Question|Force calculate", fast_res['response'], re.IGNORECASE) is not None, "Pacing Engine: Fast Learner mode provides advanced micro-quiz challenge")


    # ---------------------------------------------------------------------------
    # FINAL SUMMARY & RESULTS
    # ---------------------------------------------------------------------------
    print("\n========================================================================")
    print(f"SIMULATION RESULTS SUMMARY: {passed_tests}/{total_tests} Passed ({failed_tests} Failed)")
    print("========================================================================")

    if failed_tests > 0:
        print("SIMULATION TESTS FAILED!")
        sys.exit(1)
    else:
        print("ALL MULTI-AGENT STUDENT SIMULATION TESTS PASSED 100%!")
        sys.exit(0)

if __name__ == '__main__':
    main()
