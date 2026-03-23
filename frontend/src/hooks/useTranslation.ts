import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { startTranslation, fetchJob, cancelJob, fetchJobs } from "../api/translations";

export function useTranslationJob(bookUuid: string, jobId: number | null) {
  return useQuery({
    queryKey: ["job", bookUuid, jobId],
    queryFn: () => fetchJob(bookUuid, jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const job = query.state.data;
      if (job && (job.status === "running" || job.status === "queued")) return 1500;
      return false;
    },
  });
}

export function useJobs(bookUuid: string) {
  return useQuery({
    queryKey: ["jobs", bookUuid],
    queryFn: () => fetchJobs(bookUuid),
    enabled: !!bookUuid,
  });
}

export function useStartTranslation(bookUuid: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ scope, scopeId }: { scope?: string; scopeId?: number }) =>
      startTranslation(bookUuid, scope ?? "full", scopeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["book", bookUuid] });
      qc.invalidateQueries({ queryKey: ["jobs", bookUuid] });
    },
  });
}

export function useCancelJob(bookUuid: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: number) => cancelJob(bookUuid, jobId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs", bookUuid] });
      qc.invalidateQueries({ queryKey: ["book", bookUuid] });
    },
  });
}
