// Response shapes for the backend endpoints used by ConceptGraphPage and the
// components/Scaffold/* tree, which fetch via useBackend/useBackendMutation.
// The legacy counterparts live in main/api/legacyClient.ts and are deliberately
// separate copies — do not consolidate (see LegacyHomePage isolation).

// id is the PlAssessment row id (as a string); pl_assessment_id is PrairieLearn's own numeric
// assessment id, null until the PL-API sync job (issue #71) fills it in.
export interface Assessment {
  id: string;
  pl_assessment_id: string | null;
  name: string;
}

export interface Question {
  id: string;
  assessment_id: string;
  pl_question_uuid: string;
  title: string;
}

// Instructor-facing view of an assessment for the UnlockAssessmentsModal: includes locked
// assessments (which the plain Assessment list above excludes) and their lock state.
export interface AssessmentManagementDTO {
  id: string;
  name: string;
  locked: boolean;
}

export interface QuestionConcept {
  id: string;
  question_id: string;
  concept_id: string;
  subconcept_label: string | null;
}

export interface Course {
  id: number;
  courseName: string;
}

/**
 * An HTML string that has already been rendered from Markdown and sanitized
 * server-side (OWASP HTML sanitizer) — see MarkdownService on the backend.
 * Safe to render via `dangerouslySetInnerHTML`; do not re-escape or otherwise
 * transform it before doing so.
 */
export type SafeHtml = string;

export interface SubconceptDTO {
  id: number;
  parentId: number;
  labelHtml: SafeHtml;
}

export interface MajorConceptDTO {
  id: number;
  labelHtml: SafeHtml;
  color: string;
  subconcepts: SubconceptDTO[];
}

export interface ConceptContentDTO {
  id: number;
  parentId: number | null;
  descriptionHtml: SafeHtml | null;
  exampleHtml: SafeHtml | null;
  practiceUrl: string | null;
}

export interface PositionDTO {
  x: number;
  y: number;
}

export interface EdgeDTO {
  id: number;
  sourceId: number;
  targetId: number;
  // Set (bright red) when the edge is part of a prerequisite cycle; null otherwise.
  color: string | null;
}

export interface UserStateResponse {
  starred_ids: string[];
  detail_cards: unknown[];
  mastered_subconcepts: string[];
  top_level_positions: Record<string, { x: number; y: number }>;
}
