# Put backend/ on sys.path so tests import its modules exactly the way the app
# does when run from the backend/ root (e.g. `uvicorn main:app`): `import
# database`, `from extractor import ...`. Keeps tests and deployment consistent.
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "backend"))
