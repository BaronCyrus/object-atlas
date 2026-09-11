"""Original, non-scale exterior display sculptures. No mechanical internals.
Run in Blender's Python console with exec(open(...).read()) or blender -b -P.
Only new Atlas scenes are created; existing scenes and files are preserved.
"""
import bpy, math, json
from pathlib import Path
from mathutils import Vector
ROOT = Path(__file__).resolve().parents[1]
PREFIX = 'Atlas_'
original_scene = bpy.context.window.scene if bpy.context.window else bpy.context.scene

def material(name, color, metal=0, rough=.4):
    m = bpy.data.materials.new(PREFIX+name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    p = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Metallic'].default_value = metal
    p.inputs['Roughness'].default_value = rough
    return m

def attach(obj, name, mat, group, bevel=0):
    obj.name = name
    obj.data.materials.append(mat)
    obj.parent = groups[group]
    obj['region'] = group
    if bevel:
        mod=obj.modifiers.new('Soft exhibition edges','BEVEL'); mod.width=bevel; mod.segments=3
        obj.modifiers.new('Weighted highlights','WEIGHTED_NORMAL')
    return obj

def box(name, pos, size, mat, group, bevel=.035):
    bpy.ops.mesh.primitive_cube_add(size=1, location=pos)
    o=bpy.context.object; o.dimensions=size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return attach(o,name,mat,group,bevel)

def profile(name, coords, depth, mat, group, y=0, bevel=.035):
    n=len(coords)
    v=[(x,y+s*depth/2,z) for s in [-1,1] for x,z in coords]
    f=[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]
    f += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    mesh=bpy.data.meshes.new(name); mesh.from_pydata(v,[],f); mesh.update()
    obj=bpy.data.objects.new(name,mesh); scene.collection.objects.link(obj)
    return attach(obj,name,mat,group,bevel)

def tube(name, coords, radius, mat, group, cyclic=False):
    curve=bpy.data.curves.new(name,'CURVE'); curve.dimensions='3D'
    curve.bevel_depth=radius; curve.bevel_resolution=3; curve.resolution_u=16
    sp=curve.splines.new('BEZIER'); sp.bezier_points.add(len(coords)-1); sp.use_cyclic_u=cyclic
    for p,co in zip(sp.bezier_points,coords):
        p.co=co; p.handle_left_type='AUTO'; p.handle_right_type='AUTO'
    o=bpy.data.objects.new(name,curve); scene.collection.objects.link(o)
    bpy.context.view_layer.objects.active=o; o.select_set(True)
    bpy.ops.object.convert(target='MESH'); o.select_set(False)
    return attach(o,name,mat,group)

def disc(name, pos, radius, depth, mat, group, axis='Y'):
    rot=(math.pi/2,0,0) if axis=='Y' else (0,math.pi/2,0)
    bpy.ops.mesh.primitive_cylinder_add(vertices=32,radius=radius,depth=depth,location=pos,rotation=rot)
    o=bpy.context.object
    for p in o.data.polygons:p.use_smooth=True
    return attach(o,name,mat,group,.01)

report=[]
for key in ['g17','92fs','1911']:
    scene=bpy.data.scenes.new(PREFIX+key)
    if bpy.context.window:bpy.context.window.scene=scene
    groups={}
    for name in ['upper','frame','grip','guard']:
        g=bpy.data.objects.new(name,None); scene.collection.objects.link(g); g['region']=name; groups[name]=g
    steel=material(key+' steel',(.075,.09,.10) if key!='1911' else (.52,.57,.59),.8,.31)
    frame=material(key+' frame',(.04,.047,.05) if key=='g17' else ((.055,.074,.082) if key=='92fs' else (.4,.44,.46)),.12 if key=='g17' else .7,.42)
    grip=material(key+' grip',(.026,.033,.035) if key!='1911' else (.24,.095,.042),.02,.6)
    detail=material(key+' detail',(.13,.15,.15) if key!='1911' else (.44,.22,.10),.35,.48)
    dark=material(key+' inset',(.012,.016,.018),.2,.55)
    if key=='g17':
        profile('Upper silhouette',[(-1.65,.44),(-1.73,.53),(-1.73,.94),(-1.58,1.02),(1.03,1.02),(1.12,.94),(1.12,.45)],.43,steel,'upper',bevel=.045)
        profile('Frame silhouette',[(-1.64,.28),(-1.66,.44),(1.17,.44),(1.2,.24),(.97,.14),(1.40,-1.14),(1.28,-1.22),(.70,-1.22),(.35,-.27),(.23,.07),(-.50,.14)],.45,frame,'frame')
        gripcoords=[(.65,.06),(.98,.10),(1.33,-1.12),(.74,-1.12),(.44,-.30)]
    elif key=='92fs':
        # Open upper silhouette represented as exterior rails and a solid top accent.
        box('Rear upper contour',(.60,0,.70),(1.06,.44,.5),steel,'upper',.07)
        for y in [-.18,.18]:box('Long upper rail',(-.69,y,.56),(1.70,.115,.23),steel,'upper',.03)
        box('Front rounded contour',(-1.55,0,.72),(.29,.44,.50),steel,'upper',.075)
        disc('Solid exterior top accent',(-.70,0,.78),.13,1.60,steel,'upper','X')
        profile('Flowing frame',[(-1.48,.26),(-1.53,.43),(.91,.43),(1.19,.32),(1.04,.13),(1.33,-1.11),(1.2,-1.20),(.58,-1.17),(.28,-.20),(.23,.03),(-.42,.09)],.44,frame,'frame')
        gripcoords=[(.47,.10),(.94,.10),(1.24,-1.08),(.63,-1.08),(.36,-.20)]
        profile('Rear sculpted accent',[(.95,.43),(1.25,.53),(1.33,.70),(1.23,.79),(1.08,.65)],.16,steel,'upper')
    else:
        profile('Rounded steel upper',[(-1.73,.45),(-1.73,.81),(-1.60,.98),(.97,.98),(1.09,.84),(1.09,.45)],.40,steel,'upper',bevel=.065)
        profile('Steel frame silhouette',[(-1.65,.29),(-1.65,.43),(1.00,.43),(1.28,.30),(1.20,.17),(.98,.14),(1.37,-1.14),(1.25,-1.22),(.70,-1.22),(.34,-.24),(.30,.05),(-.54,.12)],.38,frame,'frame')
        gripcoords=[(.54,.08),(.92,.08),(1.26,-1.12),(.77,-1.13),(.42,-.20)]
        profile('Rear sculpted accent',[(.97,.42),(1.30,.62),(1.29,.80),(1.17,.82),(1.05,.60)],.14,steel,'upper')
        for y in [-.205,.205]:
            box('Brushed side inset',(-.49,y,.66),(1.8,.012,.18),steel,'upper',.01)
    for side in [-1,1]:
        profile('Grip surface',gripcoords,.055,grip,'grip',side*.245,.04)
        # Decorative relief, intentionally stylized and unrelated to manufacturing.
        for row in range(15):
            z=-.06-row*.067
            crossings=[]
            for i,(ax,az) in enumerate(gripcoords):
                bx,bz=gripcoords[(i+1)%len(gripcoords)]
                if min(az,bz) <= z < max(az,bz):
                    crossings.append(ax+(z-az)*(bx-ax)/(bz-az))
            left,right=min(crossings)+.055,max(crossings)-.055
            for col in range(5):
                x=left+(right-left)*col/4
                o=box('Grip pattern',(x,side*.281,z),(.022,.012,.028),detail,'grip',.005)
                o.rotation_euler[1]=.7
        if key!='g17':
            for x,z in [(.75,-.11),(1.0,-.92)]:
                disc('Panel medallion',(x,side*.29,z),.047,.016,steel,'grip')
        for i in range(9):
            x=.35+i*.065
            box('Rear surface rhythm',(x,side*.222,.72),(.024,.02,.31),dark,'upper',.004)
        if key=='g17':
            for i in range(6):box('Front surface rhythm',(-1.48+i*.065,side*.224,.73),(.024,.02,.27),dark,'upper',.004)
        box('Side contour accent',(.31,side*.244,.28),(.31,.035,.075),steel,'frame',.025)
    tube('Guard outline',[(-.45,0,.15),(-.49,0,-.12),(-.38,0,-.32),(.12,0,-.37),(.34,0,-.17),(.33,0,.10)],.064,frame,'guard',True)
    # Single solid decorative mark in the guard; no functional trigger mechanism.
    profile('Guard interior mark',[(.14,.05),(.20,.04),(.16,-.18),(.05,-.23),(.07,-.15)],.12,dark,'guard',bevel=.022)
    box('Top front marker',(-1.47,0,1.03),(.14,.10,.10),dark,'upper',.012)
    box('Top rear marker',(.92,0,1.03),(.15,.22,.10),dark,'upper',.014)
    box('Grip foot',(1.00,0,-1.20),(.73,.51,.10),frame,'grip',.035)
    # Flat decorative end disc, closed and without a modeled bore.
    disc('Closed front medallion',(-1.742,0,.71),.10,.012,dark,'upper','X')
    for o in scene.objects:o.select_set(o.type=='MESH' or o.type=='EMPTY')
    bpy.context.view_layer.objects.active=groups['upper']
    bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/models'/f'{key}.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_apply=True,export_extras=True,export_yup=True)
    # Studio rig belongs exclusively to this scene and is excluded from GLB.
    world=bpy.data.worlds.new(PREFIX+key+' world'); scene.world=world; world.use_nodes=True
    next(n for n in world.node_tree.nodes if n.type == 'BACKGROUND').inputs[0].default_value=(.28,.31,.33,1)
    next(n for n in world.node_tree.nodes if n.type == 'BACKGROUND').inputs[1].default_value=.55
    for name,pos,power,size in [('Key',(-3,-4,6),1000,5),('Rim',(2,3,4),1400,4),('Fill',(4,-2,1),700,3)]:
        d=bpy.data.lights.new(name,'AREA'); d.energy=power; d.shape='DISK'; d.size=size
        o=bpy.data.objects.new(name,d); scene.collection.objects.link(o); o.location=pos; o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler()
    c=bpy.data.cameras.new(PREFIX+'camera'); cam=bpy.data.objects.new(PREFIX+'camera',c); scene.collection.objects.link(cam)
    cam.location=(-3.5,-7,2.5); cam.rotation_euler=(Vector((-.10,0,-.08))-cam.location).to_track_quat('-Z','Y').to_euler(); c.type='ORTHO'; c.ortho_scale=4.4; scene.camera=cam
    scene.render.engine='CYCLES'; scene.cycles.samples=24
    scene.render.resolution_x=960; scene.render.resolution_y=720; scene.render.resolution_percentage=100
    scene.render.film_transparent=True; scene.render.image_settings.file_format='PNG'
    scene.render.filepath=str(ROOT/'public/images'/f'{key}.png')
    scene['notice']='Original non-scale exterior illustration. Not a functional or manufacturing model.'
    scene.render.filepath='//../public/images/'+key+'.png'
    bpy.data.libraries.write(str(ROOT/'models'/f'{key}.blend'),{scene},fake_user=True,compress=True)
    report.append({'model':key,'objects':len(scene.objects),'glb_bytes':(ROOT/'public/models'/f'{key}.glb').stat().st_size})
if bpy.context.window:bpy.context.window.scene=original_scene
(ROOT/'reports/models.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report))
