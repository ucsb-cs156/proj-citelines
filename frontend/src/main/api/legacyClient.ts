// Backend access for LegacyHomePage.tsx and its private components ONLY.
// Every endpoint here lives under /api/legacy/, a frozen copy of the backend
// contract, so the non-legacy endpoints can evolve without touching the legacy
// page. Do not consolidate this with the useBackend-based data access used by
// ConceptGraphPage, and do not import this module outside the LegacyHomePage tree.

const API_BASE = "/api/legacy";

export interface Assessment {
  id: string;
  pl_assessment_id: string;
  name: string;
}

export interface Question {
  id: string;
  assessment_id: string;
  pl_question_uuid: string;
  title: string;
}

export interface QuestionConcept {
  id: string;
  question_id: string;
  concept_id: string;
  subconcept_label: string | null;
}

export async function fetchAssessments(): Promise<Assessment[]> {
  const res = await fetch(`${API_BASE}/assessments`);
  return res.json();
}

export async function fetchQuestions(
  assessmentId: string,
): Promise<Question[]> {
  const res = await fetch(`${API_BASE}/assessments/${assessmentId}/questions`);
  return res.json();
}

export async function fetchQuestionConcepts(
  questionId: string,
): Promise<QuestionConcept[]> {
  const res = await fetch(`${API_BASE}/questions/${questionId}/concepts`);
  return res.json();
}

export interface LegacyUserStateResponse {
  starred_ids: string[];
  detail_cards: unknown[];
  mastered_subconcepts: string[];
}

export async function fetchLegacyUserState(
  userid: number,
): Promise<LegacyUserStateResponse | null> {
  const res = await fetch(`${API_BASE}/user-state/${userid}`);
  if (res.status === 404) return null;
  if (!res.ok)
    throw new Error(`Failed to fetch user state for userid ${userid}`);
  return res.json();
}

export async function saveLegacyUserState(body: {
  userid: number;
  starred_ids: string[];
  detail_cards: unknown[];
  mastered_subconcepts: string[];
}): Promise<void> {
  const res = await fetch(`${API_BASE}/user-state`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok)
    throw new Error(`Failed to save user state for userid ${body.userid}`);
}

export async function logLegacyUserActivity(body: {
  userid: number;
  event_type: string;
  payload: object;
}): Promise<void> {
  const res = await fetch(`${API_BASE}/user-activity`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok)
    throw new Error(`Failed to log user activity for userid ${body.userid}`);
}
