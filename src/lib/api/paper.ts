import { apiRequest } from "../../http/api";

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

export async function getPapersByExamSlug(examSlug: string, fetchFn?: typeof fetch) {
  return apiRequest<GetPapersByExamResponse>({
    endpoint: `/api/v1/papers/get-paper/${examSlug}`,
    method: 'GET',
    fetch: fetchFn
  });
}