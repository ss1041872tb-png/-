"""Run the desktop controls and pipe regression in an opaque-origin single HTML."""
from pathlib import Path
import os,runpy
os.environ['EXPLORER_SINGLE']='1'
runpy.run_path(str(Path(__file__).with_name('intuitive.py')),run_name='__main__')
