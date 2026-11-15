"""Main entrypoint for running python -m firmsync."""
import sys
from firmsync.cli import main

if __name__ == "__main__":
    sys.exit(main() or 0)
