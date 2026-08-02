/**
 * Board Types — Structured content block definitions for the Blackboard V2.
 * 
 * The core principle: AI generates structured objects. Humans annotate freely around those objects.
 * Content blocks auto-layout vertically. Freeform drawing sits on a transparent canvas layer above.
 */

// ─── Block Types ─────────────────────────────────────────────────────────────

export type BlockType = 'question' | 'result-card' | 'equation' | 'explanation' | 'flashcard' | 'text-block';

export interface QuestionOption {
  label: string;   // "A", "B", "C", "D"
  text: string;    // Option content
}

export interface QuestionBlock {
  type: 'question';
  id: string;
  number: number;
  marks: number;
  questionText: string;         // Supports KaTeX inline math
  options?: QuestionOption[];   // MCQ options (if present)
  answerInput?: 'text' | 'number' | 'selection';
  userAnswer?: string;
  correctAnswer?: string;
  status: 'unanswered' | 'correct' | 'incorrect';
  starred: boolean;
  explanation?: string;
}

export interface ResultCardBlock {
  type: 'result-card';
  id: string;
  title: string;
  score: number;
  total: number;
  correct: number;
  incorrect: number;
  unattempted: number;
}

export interface EquationBlock {
  type: 'equation';
  id: string;
  latex: string;              // KaTeX expression
  label?: string;             // Optional label e.g. "Newton's Second Law"
}

export interface ExplanationBlock {
  type: 'explanation';
  id: string;
  title?: string;
  content: string;            // Markdown/KaTeX content
  source?: string;            // "MYRAA" | "Mike" etc.
}

export interface FlashcardBlock {
  type: 'flashcard';
  id: string;
  front: string;
  back: string;
  flipped: boolean;
}

export interface TextBlockData {
  type: 'text-block';
  id: string;
  content: string;            // Free-form text / heading
  style?: 'heading' | 'paragraph' | 'note';
}

export type BoardBlock = QuestionBlock | ResultCardBlock | EquationBlock | ExplanationBlock | FlashcardBlock | TextBlockData;

// ─── Board Metadata ──────────────────────────────────────────────────────────

export interface BoardMeta {
  title: string;
  subject?: string;
  totalMarks?: number;
  questionCount?: number;
}

// ─── Freeform Drawing Types ──────────────────────────────────────────────────

export type DrawToolType = 'select' | 'pen' | 'eraser' | 'text' | 'line' | 'rect' | 'circle' | 'arrow' | 'sticky';

export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  id: string;
  tool: DrawToolType;
  color: string;
  width: number;
  points: Point[];
  endX?: number;
  endY?: number;
  text?: string;
}

// ─── AI Command Interface ────────────────────────────────────────────────────

export interface AIBoardCommand {
  /** What action the AI is performing */
  action: 'add-block' | 'update-block' | 'remove-block' | 'set-board-meta' | 'clear' | 'legacy-draw';

  /** Structured content block (for add-block / update-block) */
  block?: BoardBlock;

  /** Board-level metadata (for set-board-meta) */
  meta?: BoardMeta;

  /** Block ID to update or remove */
  blockId?: string;

  /** Legacy canvas drawing fields (backward compat) */
  draw?: {
    type: string;
    x: number;
    y: number;
    endX?: number;
    endY?: number;
    color?: string;
    width?: number;
    text?: string;
  };
}
