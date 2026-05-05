import { apiRequest } from "../../http/api";
import { resolveApiToken } from "./authToken";

export type PaperItem = {
  _id: string;
  /** When present, use for POST /test-attempts; otherwise `_id` is used (PYQ paper-as-test). */
  testId?: string;
  name: string;
  slug: string;
  shift: string;
  questionCount: number;
  examSchedule: {
    date: string;
    timing: string;
    duration: string;
  };
};

export type PapersByYearItem = {
  year: number;
  papers: PaperItem[];
};

export type GetPapersByExamResponse = {
  success: boolean;
  statusCode: number;
  message: string;
  data: PapersByYearItem[];
};

export type PaperQuestion = {
  _id: string;
  prompt?: {
    en?: {
      content?: string;
      options?: Array<{ identifier?: string; content?: string }>;
      explanation?: string;
    };
  };
  correct?: {
    identifiers?: string[];
    integer?: number;
  };
};

export type GetPaperQuestionsResponse = {
  success: boolean;
  statusCode: number;
  message: string;
  data: {
    sections: string[];
    questions: PaperQuestion[];
  };
};

export async function getPapersByExamSlug(
  examSlug: string,
  fetchFn?: typeof fetch,
  token?: string | null
) {
  const t = resolveApiToken(token);
  return apiRequest<GetPapersByExamResponse>({
    endpoint: `/api/v1/papers/get-paper/${encodeURIComponent(examSlug)}`,
    method: 'GET',
    fetch: fetchFn,
    token: t
  });
}

export async function getPaperQuestionsByPaperId(paperId: string, fetchFn?: typeof fetch, subjectSlug?: string) {
  let endpoint = `/api/v1/papers/${encodeURIComponent(paperId)}`;
  if (subjectSlug) {
    endpoint += `?subjectSlug=${encodeURIComponent(subjectSlug)}`;
  }
  return apiRequest<GetPaperQuestionsResponse>({
    endpoint,
    method: 'GET',
    fetch: fetchFn
  });
}