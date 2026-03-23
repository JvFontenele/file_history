export interface Tag {
  id: number;
  name: string;
}

export interface Book {
  id: number;
  uuid: string;
  title: string;
  author?: string;
  format: string;
  source_language: string;
  cover_path?: string;
  total_pages?: number;
  total_chapters?: number;
  total_chars?: number;
  translation_status: "pending" | "extracting" | "translating" | "done" | "error";
  created_at: string;
  updated_at: string;
  tags: Tag[];
}

export interface Chapter {
  id: number;
  index: number;
  title?: string;
  char_count?: number;
  translation_status: string;
  translated_at?: string;
  original_text?: string;
  translated_text?: string;
}

export interface PreviewPage {
  page_number: number;
  image_url?: string;
  text_snippet?: string;
}

export interface Page {
  id: number;
  page_number: number;
  image_path?: string;
  translation_status: string;
  translated_at?: string;
  original_text?: string;
  translated_text?: string;
}
