import json
import os
import sys

# Ensure UTF-8 output encoding on Windows stdout
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def validate_curriculum_schema(data):
    if not isinstance(data, dict):
        return False, "Root must be dict"
    if not isinstance(data.get('level'), str):
        return False, "'level' must be string"
    if not isinstance(data.get('grades'), list) or len(data['grades']) == 0:
        return False, "'grades' must be non-empty list"
    if not isinstance(data.get('modules'), list) or len(data['modules']) == 0:
        return False, "'modules' must be non-empty list"
    
    valid_topics_count = 0
    for m_idx, mod in enumerate(data['modules']):
        if not isinstance(mod, dict):
            return False, f"Module [{m_idx}] must be dict"
        subj = mod.get('subject')
        if not isinstance(subj, str) or len(subj.strip()) == 0:
            return False, f"Module [{m_idx}] 'subject' must be non-empty string"
        topics = mod.get('topics')
        if not isinstance(topics, list) or len(topics) == 0:
            return False, f"Module [{m_idx}] 'topics' must be non-empty list"
        
        for t in topics:
            if isinstance(t, dict) and t.get('title') and t.get('content') and (t.get('pedagogy_tip') or t.get('explanation_strategy')):
                valid_topics_count += 1
                
    if valid_topics_count == 0:
        return False, "No valid topics with required fields found"
        
    return True, f"Valid topics: {valid_topics_count}"

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
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

    print("=========================================================================")
    print("CHALLENGER STRESS TEST: CURRICULUM VALIDATOR SCHEMA BOUNDARIES (PYTHON)")
    print("=========================================================================")

    print("\n--- SUITE 1: Invalid Root & Structural Types ---")
    assert_test(not validate_curriculum_schema(None)[0], "Edge Case [Null Root]: Correctly rejected None")
    assert_test(not validate_curriculum_schema("invalid")[0], "Edge Case [String Root]: Correctly rejected primitive string")
    assert_test(not validate_curriculum_schema({})[0], "Edge Case [Empty Dict]: Correctly rejected empty dict")

    print("\n--- SUITE 2: 'level' Property Boundaries ---")
    assert_test(not validate_curriculum_schema({"level": 123, "grades": ["C1"], "modules": [{"subject": "Math", "topics": [{"title": "T", "content": "C", "pedagogy_tip": "P"}]}]})[0], "Edge Case [Numeric Level]: Correctly rejected numeric level")
    assert_test(not validate_curriculum_schema({"level": True, "grades": ["C1"], "modules": [{"subject": "Math", "topics": [{"title": "T", "content": "C", "pedagogy_tip": "P"}]}]})[0], "Edge Case [Boolean Level]: Correctly rejected boolean level")

    print("\n--- SUITE 3: 'grades' List Boundaries ---")
    assert_test(not validate_curriculum_schema({"level": "Primary", "grades": "C1", "modules": [{"subject": "Math", "topics": [{"title": "T", "content": "C", "pedagogy_tip": "P"}]}]})[0], "Edge Case [String Grades]: Correctly rejected string grades")
    assert_test(not validate_curriculum_schema({"level": "Primary", "grades": [], "modules": [{"subject": "Math", "topics": [{"title": "T", "content": "C", "pedagogy_tip": "P"}]}]})[0], "Edge Case [Empty Grades]: Correctly rejected empty list grades")

    print("\n--- SUITE 4: Modules & Topics Schema Boundaries ---")
    assert_test(not validate_curriculum_schema({"level": "Primary", "grades": ["C1"], "modules": []})[0], "Edge Case [Empty Modules]: Correctly rejected empty modules list")
    assert_test(not validate_curriculum_schema({"level": "Primary", "grades": ["C1"], "modules": [{"subject": "  ", "topics": [{"title": "T", "content": "C", "pedagogy_tip": "P"}]}]})[0], "Edge Case [Whitespace Subject]: Correctly rejected whitespace subject")
    assert_test(not validate_curriculum_schema({"level": "Primary", "grades": ["C1"], "modules": [{"subject": "Math", "topics": []}]})[0], "Edge Case [Empty Topics]: Correctly rejected module with empty topics list")
    assert_test(not validate_curriculum_schema({"level": "Primary", "grades": ["C1"], "modules": [{"subject": "Math", "topics": [{"title": "T", "content": "C"}]}]})[0], "Edge Case [Missing Tip & Strategy]: Correctly rejected topic missing tip and strategy")
    
    valid_strategy = {"level": "Primary", "grades": ["C1"], "modules": [{"subject": "Math", "topics": [{"title": "T", "content": "C", "explanation_strategy": "S"}]}]}
    assert_test(validate_curriculum_schema(valid_strategy)[0], "Edge Case [Explanation Strategy Present]: Validated topic with explanation_strategy")

    valid_tip = {"level": "Primary", "grades": ["C1"], "modules": [{"subject": "Math", "topics": [{"title": "T", "content": "C", "pedagogy_tip": "P"}]}]}
    assert_test(validate_curriculum_schema(valid_tip)[0], "Edge Case [Pedagogy Tip Present]: Validated topic with pedagogy_tip")

    print("\n--- SUITE 5: Production Datasets Boundary Verification ---")
    nursery_path = os.path.join(base_dir, 'knowledge_base', 'tutor_dataset_mike', 'curriculum_nursery_lkg_ukg.json')
    primary_path = os.path.join(base_dir, 'knowledge_base', 'tutor_dataset_mike', 'curriculum_class_1_to_5.json')
    middle_path = os.path.join(base_dir, 'knowledge_base', 'tutor_dataset_mike', 'curriculum_class_6_to_8.json')

    with open(nursery_path, 'r', encoding='utf-8') as f:
        nursery_data = json.load(f)
    with open(primary_path, 'r', encoding='utf-8') as f:
        primary_data = json.load(f)
    with open(middle_path, 'r', encoding='utf-8') as f:
        middle_data = json.load(f)

    assert_test(validate_curriculum_schema(nursery_data)[0], "Prod Verification [Nursery Curriculum]: Passed schema validation")
    assert_test(validate_curriculum_schema(primary_data)[0], "Prod Verification [Primary Curriculum]: Passed schema validation")
    assert_test(validate_curriculum_schema(middle_data)[0], "Prod Verification [Middle Curriculum]: Passed schema validation")

    print("\n=========================================================================")
    print(f"CURRICULUM STRESS TEST SUMMARY (PYTHON): {passed_tests}/{total_tests} Passed ({failed_tests} Failed)")
    print("=========================================================================")

    if failed_tests > 0:
        sys.exit(1)
    else:
        sys.exit(0)

if __name__ == '__main__':
    main()
