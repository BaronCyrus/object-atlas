import bpy, sys
from pathlib import Path
key=sys.argv[-1]
root=Path(__file__).resolve().parents[1]
scene=next(s for s in bpy.data.scenes if s.name.startswith('Atlas_'+key))
scene.render.filepath=str(root/'public/images'/f'{key}.png')
bpy.ops.render.render(write_still=True,scene=scene.name)
