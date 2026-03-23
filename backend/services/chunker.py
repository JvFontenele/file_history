import nltk

# Download punkt tokenizer if not present
try:
    nltk.data.find("tokenizers/punkt_tab")
except LookupError:
    nltk.download("punkt_tab", quiet=True)


def chunk_text(text: str, max_chars: int = 1800) -> list[str]:
    """Split text into chunks of at most max_chars, never breaking sentences."""
    if not text or not text.strip():
        return []

    sentences = nltk.sent_tokenize(text)
    chunks: list[str] = []
    current: list[str] = []
    current_len = 0

    for sentence in sentences:
        sentence_len = len(sentence)
        if current_len + sentence_len > max_chars and current:
            chunks.append(" ".join(current))
            current = [sentence]
            current_len = sentence_len
        else:
            current.append(sentence)
            current_len += sentence_len + 1  # +1 for space

    if current:
        chunks.append(" ".join(current))

    return chunks
