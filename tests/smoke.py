"""Current acceptance entry point: the alley adventure replaces the instant-stamp prototype."""
from pathlib import Path
import runpy
runpy.run_path(str(Path(__file__).with_name('adventure.py')), run_name='__main__')
