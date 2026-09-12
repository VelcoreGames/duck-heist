from PIL import ImageFile
import runpy

ImageFile.LOAD_TRUNCATED_IMAGES = True
runpy.run_path('scripts/build-definitive-duck-atlas.py', run_name='__main__')
