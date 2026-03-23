import time
import ollama
from ..config import settings

SYSTEM_PROMPT = (
    "Você é um tradutor literário profissional. "
    "Traduza o texto a seguir para Português Brasileiro (pt-BR). "
    "Preserve parágrafos, travessões de diálogo, ênfases e estrutura. "
    "Para HQs: efeitos sonoros devem ter equivalente natural em português. "
    "Retorne APENAS o texto traduzido, sem comentários ou explicações."
)


def get_client() -> ollama.Client:
    return ollama.Client(host=settings.ollama_url)


def translate_chunk(text: str, retries: int = 3) -> str:
    client = get_client()
    for attempt in range(retries):
        try:
            response = client.chat(
                model=settings.ollama_model,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": text},
                ],
            )
            return response.message.content.strip()
        except Exception as e:
            if attempt < retries - 1:
                time.sleep(2 ** attempt)
            else:
                raise RuntimeError(f"Translation failed after {retries} attempts: {e}") from e
    return text  # unreachable


def ensure_model_available() -> bool:
    """Pull model if not present. Returns True if successful."""
    client = get_client()
    try:
        client.show(settings.ollama_model)
        return True
    except Exception:
        try:
            client.pull(settings.ollama_model)
            return True
        except Exception:
            return False
