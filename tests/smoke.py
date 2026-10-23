"""Current acceptance entry point: in-store exploration and automatic meal collection."""
from pathlib import Path
import runpy
runpy.run_path(str(Path(__file__).with_name('adventure.py')), run_name='__main__')
