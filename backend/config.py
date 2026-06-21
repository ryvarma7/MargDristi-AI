from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR.parent / "models"
DATA_DIR = BASE_DIR.parent / "data"

# ---------------------------------------------------------------------------
# Hugging Face dataset URLs
# ---------------------------------------------------------------------------
HF_BASE = "https://huggingface.co/datasets/ryvarma7/margdristiViolationdatasets/resolve/main"

HF_DATASET_URLS: dict[str, str] = {
    "violations_clean.csv": f"{HF_BASE}/violations_clean.csv",
    "violations_clustered.csv": f"{HF_BASE}/violations_clustered.csv",
}

# Cache lives inside the data/ folder next to the other CSV files.
# On Vercel the filesystem is read-only except for /tmp, so we fall back there.
_default_cache = DATA_DIR
_vercel_tmp = Path("/tmp/margdristi_cache")

def get_cache_dir() -> Path:
    """Return a writable cache directory, preferring data/ and falling back to /tmp."""
    candidate = _default_cache
    try:
        candidate.mkdir(parents=True, exist_ok=True)
        # Quick write-test
        _probe = candidate / ".write_probe"
        _probe.touch()
        _probe.unlink()
        return candidate
    except OSError:
        _vercel_tmp.mkdir(parents=True, exist_ok=True)
        return _vercel_tmp
