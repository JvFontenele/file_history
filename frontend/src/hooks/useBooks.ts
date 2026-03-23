import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchBooks, fetchBook, uploadBook, createHQ, updateBook, deleteBook } from "../api/books";

export function useBooks(params?: Record<string, string>) {
  return useQuery({
    queryKey: ["books", params],
    queryFn: () => fetchBooks(params),
    refetchInterval: (query) => {
      const books = query.state.data;
      if (books?.some((b) => b.translation_status === "translating" || b.translation_status === "extracting")) {
        return 3000;
      }
      return false;
    },
  });
}

export function useBook(uuid: string) {
  return useQuery({
    queryKey: ["book", uuid],
    queryFn: () => fetchBook(uuid),
    enabled: !!uuid,
  });
}

export function useUploadBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (form: FormData) => uploadBook(form),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["books"] }),
  });
}

export function useCreateHQ() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (form: FormData) => createHQ(form),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["books"] }),
  });
}

export function useUpdateBook(uuid: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title?: string; author?: string; tags?: string[] }) => updateBook(uuid, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["books"] });
      qc.invalidateQueries({ queryKey: ["book", uuid] });
    },
  });
}

export function useDeleteBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (uuid: string) => deleteBook(uuid),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["books"] }),
  });
}
