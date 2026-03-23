import { useQuery } from "@tanstack/react-query";
import { fetchBook, fetchChapters, fetchPages } from "../api/books";

export function useBook(uuid: string) {
  return useQuery({
    queryKey: ["book", uuid],
    queryFn: () => fetchBook(uuid),
    enabled: !!uuid,
    refetchInterval: (query) => {
      const b = query.state.data;
      if (b && (b.translation_status === "translating" || b.translation_status === "extracting")) return 3000;
      return false;
    },
  });
}

export function useChapters(uuid: string, enabled = true) {
  return useQuery({
    queryKey: ["chapters", uuid],
    queryFn: () => fetchChapters(uuid),
    enabled: !!uuid && enabled,
  });
}

export function usePages(uuid: string, enabled = true) {
  return useQuery({
    queryKey: ["pages", uuid],
    queryFn: () => fetchPages(uuid),
    enabled: !!uuid && enabled,
  });
}
