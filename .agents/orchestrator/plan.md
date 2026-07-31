# Project Plan: Mike (Cartoon Mouse Master AI Tutor) Training, Evaluation & Pedagogical Quality Audit

## Overview
Comprehensive training, curriculum validation, multi-agent evaluation, and pedagogical quality audit across Nursery to Class 8 in English, Hindi, and Hinglish for Mike the Cartoon Mouse Master AI Tutor.

## Milestones

### Milestone 0: Exploration & Architecture Baseline
- Scope out current repository structure, existing curriculum data, Mike's persona prompt / tutor engine code, evaluation scripts, and memory storage files.
- Deliverable: Detailed codebase exploration report in `.agents/explorer_0/analysis.md`.

### Milestone 1: Curriculum & Facts Store Audit and Expansion (R1)
- Verify and expand dataset coverage for Nursery, LKG, UKG (phonics, CVC words, 1-100, shapes, Swar/Vyanjan).
- Verify and expand dataset coverage for Primary 1-5 (long division, fractions, solar system, digestive system, grammar rules).
- Verify and expand dataset coverage for Middle School 6-8 (linear equations, Pythagoras theorem, physics motion/force, chemistry acids/bases, active/passive voice).
- Deliverable: Updated/expanded curriculum data & validation test suite passing 100%.

### Milestone 2: Multi-Agent Simulation & Diagnostic Onboarding / Pacing Engine (R2)
- Simulate student personas:
  - Nursery toddlers (short sentences, simple phonics/shapes)
  - Class 3 slow learners (gentle pacing, story-based explanations, enthusiastic praise)
  - Class 8 algebra students speaking Hinglish (equations, Pythagoras, physics/chem in Hinglish)
- Verify 3-step diagnostic onboarding (grade, language preference, topic).
- Deliverable: Automated multi-agent persona simulation suite and verification tests.

### Milestone 3: Automated Pedagogical Quality Audit & Memory Isolation (R3)
- Automated checks for:
  - Zero hallucination in factual explanations across grades and topics.
  - Polite & encouraging tone ("Shabaash!", "Arey वाह!").
  - Step-by-step breakdown of complex concepts.
  - Strictly isolated memory persistence in `memories_mike.json` with zero cross-contamination to MYRAA (`memories.json`) or Ria (`memories_ria.json`).
- Deliverable: Pedagogical quality audit runner & memory integrity test suite.

### Milestone 4: Final End-to-End Verification & Verification Gate
- Run full test suite covering R1, R2, R3.
- Run Forensic Auditor to guarantee zero cheating / facade implementations.
- Publish final completion report.
