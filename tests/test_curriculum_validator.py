import json
import os
import re
import sys

# Ensure UTF-8 output encoding on Windows stdout
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    nursery_path = os.path.join(base_dir, 'knowledge_base', 'tutor_dataset_mike', 'curriculum_nursery_lkg_ukg.json')
    primary_path = os.path.join(base_dir, 'knowledge_base', 'tutor_dataset_mike', 'curriculum_class_1_to_5.json')
    middle_path = os.path.join(base_dir, 'knowledge_base', 'tutor_dataset_mike', 'curriculum_class_6_to_8.json')
    atomic_facts_path = os.path.join(base_dir, 'knowledge_base', 'mike_tutor_atomic_facts.json')
    
    total_tests = 0
    passed_tests = 0
    failed_tests = 0
    
    def assert_test(condition, message):
        nonlocal total_tests, passed_tests, failed_tests
        total_tests += 1
        if condition:
            print(f"  [PASS] {message}")
            passed_tests += 1
        else:
            print(f"  [FAIL] {message}")
            failed_tests += 1

    print("=================================================")
    print("MYRAA CURRICULUM & ATOMIC FACTS VALIDATOR (PYTHON)")
    print("=================================================")

    print("\n--- TEST SUITE 1: JSON Schema & File Integrity ---")
    
    nursery_data = None
    primary_data = None
    middle_data = None
    atomic_facts_data = None
    
    try:
        with open(nursery_path, 'r', encoding='utf-8') as f:
            nursery_data = json.load(f)
        assert_test(True, f"Loaded {os.path.basename(nursery_path)}")
    except Exception as e:
        assert_test(False, f"Failed to load {os.path.basename(nursery_path)}: {e}")
        
    try:
        with open(primary_path, 'r', encoding='utf-8') as f:
            primary_data = json.load(f)
        assert_test(True, f"Loaded {os.path.basename(primary_path)}")
    except Exception as e:
        assert_test(False, f"Failed to load {os.path.basename(primary_path)}: {e}")
        
    try:
        with open(middle_path, 'r', encoding='utf-8') as f:
            middle_data = json.load(f)
        assert_test(True, f"Loaded {os.path.basename(middle_path)}")
    except Exception as e:
        assert_test(False, f"Failed to load {os.path.basename(middle_path)}: {e}")
        
    try:
        with open(atomic_facts_path, 'r', encoding='utf-8') as f:
            atomic_facts_data = json.load(f)
        assert_test(True, f"Loaded {os.path.basename(atomic_facts_path)}")
    except Exception as e:
        assert_test(False, f"Failed to load {os.path.basename(atomic_facts_path)}: {e}")

    def validate_curriculum_schema(data, name):
        assert_test(isinstance(data.get('level'), str), f"{name}: 'level' is string")
        assert_test(isinstance(data.get('grades'), list) and len(data['grades']) > 0, f"{name}: 'grades' non-empty array")
        assert_test(isinstance(data.get('modules'), list) and len(data['modules']) > 0, f"{name}: 'modules' non-empty array")
        
        valid_topics = 0
        for m_idx, mod in enumerate(data.get('modules', [])):
            assert_test(isinstance(mod.get('subject'), str) and len(mod['subject']) > 0, f"{name} Mod [{m_idx}]: 'subject' string present")
            assert_test(isinstance(mod.get('topics'), list) and len(mod['topics']) > 0, f"{name} Mod [{m_idx}]: 'topics' array present")
            for t in mod.get('topics', []):
                if t.get('title') and t.get('content') and (t.get('pedagogy_tip') or t.get('explanation_strategy')):
                    valid_topics += 1
        assert_test(valid_topics > 0, f"{name}: Valid topics structure present ({valid_topics} topics)")

    validate_curriculum_schema(nursery_data, "Nursery-UKG Curriculum")
    validate_curriculum_schema(primary_data, "Class 1-5 Curriculum")
    validate_curriculum_schema(middle_data, "Class 6-8 Curriculum")
    
    assert_test(isinstance(atomic_facts_data, list) and len(atomic_facts_data) >= 10, "Atomic Facts Store: array with >= 10 facts")

    print("\n--- TEST SUITE 2: Grade Band Required Topic Verification ---")
    
    all_text = "\n".join([
        json.dumps(nursery_data, ensure_ascii=False),
        json.dumps(primary_data, ensure_ascii=False),
        json.dumps(middle_data, ensure_ascii=False),
        json.dumps(atomic_facts_data, ensure_ascii=False)
    ])
    
    # Nursery-UKG requirements
    nursery_reqs = [
        ("Phonics", r"phonics"),
        ("A-Z letters", r"A for Apple|A-Z"),
        ("CVC words (cat, mat, pin, top, tub)", r"cat.*mat.*pin.*top.*tub|cat, mat, pin, top, tub"),
        ("Counting 1-100", r"1-100|1 to 100"),
        ("Basic shapes", r"Circle|Square|Triangle|Rectangle"),
        ("Colors", r"Red|Blue|Yellow|Green"),
        ("Animals", r"Lion|Tiger|Cow|Peacock"),
        ("Body parts & 5 senses", r"Eyes|Ears|Nose|Tongue|Skin|senses"),
        ("Hindi Swar (अ से अः)", r"अ से अः|स्वर"),
        ("Hindi Vyanjan (क से ज्ञ)", r"क से ज्ञ|व्यंजन")
    ]
    
    print("Sub-suite 2.1: Nursery, LKG, UKG Topic Verification")
    for name, pattern in nursery_reqs:
        match = re.search(pattern, all_text, re.IGNORECASE)
        assert_test(match is not None, f"Nursery-UKG Requirement Present: {name}")

    # Primary Class 1-5 requirements
    primary_reqs = [
        ("Addition/subtraction with regrouping", r"regrouping|carrying|borrowing"),
        ("Multiplication tables 1-10", r"tables 1 to 10|tables 1-10|tables 2 to 10"),
        ("Long division step-by-step", r"long division.*step|dividend = \(divisor"),
        ("Fractions", r"fractions|proper, improper"),
        ("Perimeter and Area", r"perimeter.*area|2 x \(length \+ breadth\)|side x side"),
        ("LCM & HCF", r"LCM.*HCF|Lowest Common Multiple"),
        ("Unitary method", r"unitary method"),
        ("Living vs non-living", r"living vs non-living|living things"),
        ("Human digestive & respiratory system", r"digestive system.*respiratory system|digestive tract|nasal"),
        ("Solar system", r"solar system|mercury, venus, earth"),
        ("States of matter", r"states of matter|solid.*liquid.*gas"),
        ("English grammar rules (nouns, pronouns, verbs, tenses)", r"nouns.*pronouns.*verbs.*tenses"),
        ("Hindi Vyakaran (Sangya, Sarvanam, Kriya, Visheshaan)", r"संज्ञा.*सर्वनाम.*क्रिया.*विशेषण|Sangya.*Sarvanam")
    ]
    
    print("Sub-suite 2.2: Primary Class 1-5 Topic Verification")
    for name, pattern in primary_reqs:
        match = re.search(pattern, all_text, re.IGNORECASE)
        assert_test(match is not None, f"Primary Class 1-5 Requirement Present: {name}")

    # Middle School Class 6-8 requirements
    middle_reqs = [
        ("Integers", r"integers"),
        ("Linear equations in one variable", r"linear equations|2x \+ 5 = 15"),
        ("Pythagoras theorem (a^2 + b^2 = c^2)", r"pythagoras theorem|a\^2 \+ b\^2 = c\^2"),
        ("Exponents & powers", r"exponents.*powers|a\^m"),
        ("Mensuration", r"mensuration|trapezium|surface area"),
        ("Physics motion (v = u + at)", r"motion.*v = u \+ at|rectilinear"),
        ("Physics force (F = ma)", r"force.*F = m.*a|F = ma"),
        ("Physics pressure", r"pressure.*F / A|pressure = force"),
        ("Chemistry acids, bases, pH & litmus indicators", r"acids.*bases.*pH.*litmus"),
        ("Biology cell structure", r"cell structure|cell membrane"),
        ("Biology photosynthesis (6CO2 + 6H2O -> C6H12O6 + 6O2)", r"photosynthesis.*6CO2 \+ 6H2O -> C6H12O6 \+ 6O2|6CO2"),
        ("Active & Passive voice", r"active & passive|active to passive"),
        ("Direct & Indirect speech", r"direct & indirect|direct to indirect")
    ]
    
    print("Sub-suite 2.3: Middle School Class 6-8 Topic Verification")
    for name, pattern in middle_reqs:
        match = re.search(pattern, all_text, re.IGNORECASE)
        assert_test(match is not None, f"Middle School Class 6-8 Requirement Present: {name}")

    print("\n--- TEST SUITE 3: Multilingual Representation (English, Hindi, Hinglish) ---")
    
    devanagari_match = re.search(r'[\u0900-\u097F]', all_text)
    hinglish_match = re.search(r'chalo|karte|hain|matlab|kaunsi|samajh|aaya|shabash|शाबाश|फिर से', all_text, re.IGNORECASE)
    english_match = re.search(r'English Grammar|Pedagogy|Curriculum', all_text, re.IGNORECASE)
    
    assert_test(devanagari_match is not None, "Devanagari Hindi script representation verified")
    assert_test(hinglish_match is not None, "Hinglish mixed phrase representation verified")
    assert_test(english_match is not None, "English representation verified")

    print("\n=================================================")
    print(f"RESULTS SUMMARY: {passed_tests}/{total_tests} Passed ({failed_tests} Failed)")
    print("=================================================")
    
    if failed_tests > 0:
        print("CURRICULUM VALIDATION FAILED!")
        sys.exit(1)
    else:
        print("ALL CURRICULUM VALIDATION TESTS PASSED 100%!")
        sys.exit(0)

if __name__ == '__main__':
    main()
