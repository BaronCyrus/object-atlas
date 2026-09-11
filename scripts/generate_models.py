"""Photo-guided, non-functional digital exhibit sculptures.
Coordinates are arbitrary artistic units from external silhouettes, not physical dimensions.
No working internals, chamber, rifling, fitting surfaces, or manufacturing tolerances.
Creates only independent Atlas_v2 scenes; never changes existing scene objects.
"""
import bpy, math, json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
original_scene=bpy.context.window.scene if bpy.context.window else bpy.context.scene
PARTS=['slide','barrel','frame','grip','guard','trigger','front_sight','rear_sight','magazine','controls','rear']

def mat(name,color,metal=.0,rough=.45,texture=None,normal_strength=.14):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
    if texture:
        for suffix,socket,color_space in [('color','Base Color','sRGB'),('roughness','Roughness','Non-Color'),('normal',None,'Non-Color')]:
            ext='png' if suffix=='normal' else 'jpg'
            image=bpy.data.images.load(str(ROOT/'public/textures'/f'{texture}-{suffix}.{ext}'),check_existing=True)
            image.colorspace_settings.name=color_space
            tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=image
            if socket:m.node_tree.links.new(tex.outputs['Color'],p.inputs[socket])
            else:
                normal=m.node_tree.nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=normal_strength
                m.node_tree.links.new(tex.outputs['Color'],normal.inputs['Color']);m.node_tree.links.new(normal.outputs['Normal'],p.inputs['Normal'])
    return m

def finish(obj,name,material,part,bevel=.012,smooth=False):
    obj.name=name;obj.data.materials.append(material);obj.parent=groups[part];obj['region']=part
    if bevel:
        m=obj.modifiers.new('Edge highlights','BEVEL');m.width=bevel;m.segments=3
        obj.modifiers.new('Weighted surface normals','WEIGHTED_NORMAL')
    if smooth:
        for face in obj.data.polygons:face.use_smooth=True
    return obj

def profile(name,points,depth,material,part,y=0,bevel=.018):
    n=len(points);vertices=[(x,y+s*depth/2,z) for s in [-1,1] for x,z in points]
    faces=[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(vertices,[],faces);mesh.update()
    uv=mesh.uv_layers.new(name='Surface UV')
    for poly in mesh.polygons:
        for li in poly.loop_indices:
            co=mesh.vertices[mesh.loops[li].vertex_index].co
            uv.data[li].uv=(co.x*.85,co.z*.85)
    obj=bpy.data.objects.new(name,mesh);scene.collection.objects.link(obj)
    return finish(obj,name,material,part,bevel)

def pp(name,pts,depth,material,part,y=0,bevel=.018):
    return profile(name,[( (x-origin[0])/scale,(origin[1]-z)/scale) for x,z in pts],depth,material,part,y,bevel)

def box(name,pos,size,material,part,bevel=.015,rotate=0):
    bpy.ops.mesh.primitive_cube_add(size=1,location=pos);o=bpy.context.object;o.dimensions=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.rotation_euler[1]=rotate
    return finish(o,name,material,part,bevel)

def ring(name,outer,inner,depth,material,part):
    def smooth_loop(points):
        result=[]
        for i,p1 in enumerate(points):
            p0,p2,p3=points[i-1],points[(i+1)%len(points)],points[(i+2)%len(points)]
            for j in range(8):
                t=j/8
                result.append(tuple(.5*((2*p1[k])+(-p0[k]+p2[k])*t+(2*p0[k]-5*p1[k]+4*p2[k]-p3[k])*t*t+(-p0[k]+3*p1[k]-3*p2[k]+p3[k])*t*t*t) for k in range(2)))
        return result
    outer,inner=smooth_loop(outer),smooth_loop(inner)
    outer=[((x-origin[0])/scale,(origin[1]-z)/scale) for x,z in outer]
    inner=[((x-origin[0])/scale,(origin[1]-z)/scale) for x,z in inner]
    n=len(outer);assert n==len(inner)
    verts=[(x,y,z) for y in [-depth/2,depth/2] for path in [outer,inner] for x,z in path]
    faces=[]
    for i in range(n):
        j=(i+1)%n
        faces.extend([(i,j,n+j,n+i),(2*n+i,3*n+i,3*n+j,2*n+j),(i,2*n+i,2*n+j,j),(n+i,n+j,3*n+j,3*n+i)])
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    o=bpy.data.objects.new(name,mesh);scene.collection.objects.link(o)
    return finish(o,name,material,part,.013,True)

def cylinder(name,pos,radius,length,material,part,axis='X',vertices=48):
    rot=(0,math.pi/2,0) if axis=='X' else (math.pi/2,0,0)
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=length,location=pos,rotation=rot)
    return finish(bpy.context.object,name,material,part,.009,True)

def stroke(name,points,radius,material,part):
    c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=radius;c.bevel_resolution=2
    sp=c.splines.new('BEZIER');sp.bezier_points.add(len(points)-1)
    for p,co in zip(sp.bezier_points,points):p.co=co;p.handle_left_type='AUTO';p.handle_right_type='AUTO'
    o=bpy.data.objects.new(name,c);scene.collection.objects.link(o)
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH')
    return finish(o,name,material,part,0,True)

def rounded_slide(name,x0,x1,z0,z1,depth,material,part='slide',crown=True):
    half=depth/2;cross=[(-half,z0),(half,z0),(half,z1-half*.65)]
    if crown:
        cross += [(math.cos(a)*half,z1-half*.65+math.sin(a)*half*.65) for a in [i*math.pi/16 for i in range(17)]]
    else:cross += [(half*.85,z1),(-half*.85,z1),(-half,z1-half*.65)]
    cross += [(-half,z1-half*.65)]
    # Remove adjacent duplicate vertices for stable normals.
    cross=[co for i,co in enumerate(cross) if i==0 or co!=cross[i-1]]
    n=len(cross);verts=[(x,y,z) for x in [x0,x1] for y,z in cross]
    faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    uv=mesh.uv_layers.new(name='Surface UV')
    for poly in mesh.polygons:
        for li in poly.loop_indices:
            co=mesh.vertices[mesh.loops[li].vertex_index].co;uv.data[li].uv=(co.x*.4,co.z*.4+co.y*.4)
    o=bpy.data.objects.new(name,mesh);scene.collection.objects.link(o)
    return finish(o,name,material,part,.022,True)

def serrations(x0,count,spacing,z,y,height,material,slant=0):
    for side in [-1,1]:
        for i in range(count):
            o=box('Recessed exterior serration',(x0+i*spacing,side*y,z),(.022,.012,height),material,'slide',.003,slant)

def label(text,pos,size,material,part):
    c=bpy.data.curves.new('Exhibit identification','FONT');c.body=text;c.size=size;c.extrude=.0004;c.space_character=1.05
    o=bpy.data.objects.new('Exhibit identification',c);scene.collection.objects.link(o);o.location=pos;o.rotation_euler=(math.pi/2,0,0)
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH')
    finish(o,text,material,part,0)

def panel_pattern(points,y,material,part='grip',step=.047):
    # Thin diamond relief follows the actual panel outline, never floating outside it.
    xz=[((x-origin[0])/scale,(origin[1]-z)/scale) for x,z in points]
    zmin=min(z for x,z in xz)+.08;zmax=max(z for x,z in xz)-.09
    z=zmin
    while z<zmax:
        cuts=[]
        for i,(x1,z1) in enumerate(xz):
            x2,z2=xz[(i+1)%len(xz)]
            if min(z1,z2)<=z<max(z1,z2):cuts.append(x1+(z-z1)*(x2-x1)/(z2-z1))
        if len(cuts)>=2:
            a,b=min(cuts)+.065,max(cuts)-.065
            # Relief diamonds, grouped and later merged for few draw calls.
            x=a
            while x<b:
                if key!='1911' or abs(x-(a+b)/2)>.038 or (zmin+.22<z<zmax-.24):
                    o=box('Fine panel checkering',(x,y,z),(.018,.005,.029),material,part,.001,math.pi/4)
                x+=step
        z+=step

report=[]
for key in ['g17','92fs','1911']:
    scene=bpy.data.scenes.new('Atlas_v2_'+key);bpy.context.window.scene=scene
    groups={}
    for part in PARTS:
        o=bpy.data.objects.new(part,None);scene.collection.objects.link(o);o['region']=part;groups[part]=o
    dark=mat(key+' dark oxide',(.027,.032,.037),.8,.33)
    steel=mat(key+' brushed steel',(.42,.44,.46),.88,.31,'steel',.075)
    polymer=mat(key+' polymer frame',(.024,.028,.027),0,.64)
    stipple=mat(key+' grip stipple',(.023,.026,.026),0,.72,'polymer',.23)
    rubber=mat(key+' checkered composite',(.025,.029,.029),0,.67,'rubber',.5)
    wood=mat(key+' walnut',(.19,.048,.012),0,.49,'wood',.14)
    black=mat(key+' recessed dark',(.003,.004,.005),.3,.68)
    edge=mat(key+' satin edge',(.10,.115,.125),.75,.43)
    engraving=mat(key+' subtle markings',(.055,.063,.069),.45,.55)
    silver=mat(key+' screws',(.34,.36,.37),.92,.24)
    white=mat(key+' white sight marking',(.68,.71,.66),.1,.53)
    body=polymer if key=='g17' else dark if key=='92fs' else steel
    slide_mat=dark if key!='1911' else steel
    if key=='g17':
        origin=(374,245);scale=90
        pp('Squared Gen5 slide',[(205,157),(210,148),(516,148),(520,152),(520,185),(207,185)],.43,dark,'slide',bevel=.026)
        pp('Polymer frame contour',[(208,187),(521,187),(526,196),(510,200),(503,214),(499,230),(477,232),(447,219),(422,210),(405,215),(330,211),(212,210)],.46,polymer,'frame',bevel=.035)
        grip_pts=[(424,210),(477,204),(496,212),(499,232),(514,267),(544,344),(541,355),(525,362),(464,360),(452,350),(410,255),(408,243),(424,234)]
        pp('Shaped polymer grip',grip_pts,.47,polymer,'grip',bevel=.055)
        panel=[(441,239),(484,235),(533,343),(522,349),(468,346),(425,253)]
        for side in [-1,1]:pp('Stippled side panel',panel,.012,stipple,'grip',side*.244,.03)
        ring('Squared trigger guard',[(326,209),(354,208),(396,212),(414,226),(414,244),(403,257),(325,260),(320,254),(321,229),(321,217)],[(336,217),(354,216),(393,219),(404,228),(404,242),(395,249),(334,250),(330,245),(331,230),(332,222)],.31,polymer,'guard')
        pp('Curved trigger face',[(375,213),(388,214),(388,226),(379,239),(368,247),(365,242),(375,228)],.10,black,'trigger',bevel=.018)
        pp('Trigger central accent',[(378,213),(382,214),(381,229),(370,242),(369,237),(377,226)],.025,edge,'trigger',y=-.06,bevel=.005)
        pp('Magazine exterior',[(441,264),(490,253),(523,363),(458,369)],.33,black,'magazine',bevel=.022)
        pp('Magazine floor plate',[(451,362),(522,361),(530,371),(521,375),(459,374),(452,370)],.47,black,'magazine',bevel=.015)
        serrations(-1.76,8,.080,.845,.221,.31,black)
        serrations(.84,8,.078,.845,.221,.31,black)
        # Front sight and rear notch are represented as exterior shapes only.
        box('Front sight',(-1.72,0,1.12),(.115,.10,.075),dark,'front_sight',.014)
        for side in [-1,1]:box('Rear sight shoulder',(1.38,side*.09,1.125),(.11,.09,.10),dark,'rear_sight',.012)
        box('Rear sight bridge',(1.38,0,1.08),(.11,.26,.055),dark,'rear_sight',.012)
        box('Rear sight painted mark',(1.445,-.086,1.135),(.004,.043,.035),white,'rear_sight',.001)
        cylinder('Barrel exterior front',(-.50,0,.86),.115,2.86,edge,'barrel')
        cylinder('Dark closed muzzle recess',(-1.935,0,.86),.080,.003,black,'barrel')
        pp('Rear cover plate',[(510,154),(516,154),(516,182),(510,182)],.34,black,'rear',bevel=.012)
        for side in [-1,1]:
            pp('Slide stop exterior',[(419,185),(436,185),(436,193),(422,196),(418,193)],.025,dark,'controls',side*.25,.006)
            pp('Release button exterior',[(422,232),(437,227),(441,241),(426,246)],.023,dark,'controls',side*.258,.006)
            cylinder('Frame pin',(.05,side*.251,.49),.029,.012,edge,'controls','Y')
            box('Frame side seam',(-1.34,side*.234,.51),(.82,.008,.022),black,'frame',.001)
            for i in range(4):box('Underframe exterior rail',(-1.53+i*.20,side*.17,.41),(.025,.12,.045),black,'frame',.002)
        label('G17   GEN5',(-.70,-.228,.805),.070,engraving,'slide')
        label('9 x 19',(.23,-.228,.815),.046,engraving,'slide')
        barrel_anchor=(-1.92,.86,0)
    elif key=='92fs':
        origin=(350,350);scale=170
        # Open-top slide: broad side rails, curved rear cap, front bridge.
        rounded_slide('Rear slide crown',.27,1.50,.51,1.15,.44,dark)
        for side in [-1,1]:
            pp('Open upper side rail',[(47,195),(94,197),(398,197),(413,247),(579,245),(626,263),(52,263)],.083,dark,'slide',side*.193,.020)
        rounded_slide('Front slide bridge',-1.79,-1.53,.53,1.17,.44,dark)
        cylinder('Visible barrel outer surface',(-.79,0,1.045),.13,2.16,edge,'barrel')
        cylinder('Closed muzzle recess',(-1.89,0,1.045),.089,.004,black,'barrel')
        pp('Alloy frame profile',[(53,265),(620,257),(642,274),(626,295),(620,336),(568,327),(529,300),(482,294),(450,284),(398,284),(380,273),(367,282),(318,287),(290,283),(276,278),(227,274),(53,283)],.45,dark,'frame',bevel=.025)
        grip_pts=[(482,281),(543,290),(603,302),(624,337),(652,447),(668,517),(660,542),(533,551),(518,538),(511,490),(496,420),(475,358),(461,340)]
        pp('Rounded grip body',grip_pts,.49,dark,'grip',bevel=.049)
        panel=[(493,299),(539,301),(577,319),(601,359),(643,509),(641,524),(553,531),(538,515),(526,441),(507,381),(489,338)]
        for side in [-1,1]:
            pp('Checkered grip panel',panel,.06,rubber,'grip',side*.25,.026)
            panel_pattern(panel,side*.284,engraving,step=.050)
            for px,pz in [(528,315),(585,500)]:
                pos=((px-350)/170,side*.291,(350-pz)/170)
                cylinder('Grip screw',pos,.056,.013,silver,'grip','Y')
                box('Screw slot',(pos[0],side*.302,pos[2]),(.080,.004,.009),black,'grip',.001,math.pi/5)
            cylinder('Grip medallion',((558-350)/170,side*.29,(350-390)/170),.19,.010,edge,'grip','Y')
        ring('Sculpted trigger guard',[(315,281),(343,278),(396,283),(433,291),(463,323),(461,351),(436,369),(346,376),(310,365),(302,339)],[(327,293),(345,289),(394,294),(425,302),(447,325),(448,345),(431,356),(350,362),(325,354),(314,337)],.29,dark,'guard')
        pp('Arched trigger exterior',[(387,287),(405,289),(411,300),(405,324),(391,348),(365,361),(365,354),(382,333),(389,307)],.105,dark,'trigger',bevel=.012)
        pp('Magazine exterior',[(520,383),(587,372),(626,543),(535,548)],.34,black,'magazine',bevel=.02)
        pp('Magazine floor plate',[(523,541),(658,535),(660,551),(547,563),(526,555)],.50,dark,'magazine',bevel=.018)
        serrations(.35,14,.047,.70,.237,.31,black,slant=-.19)
        pp('Front sight blade',[(43,153),(58,141),(71,141),(78,158),(44,158)],.078,dark,'front_sight',bevel=.008)
        for side in [-1,1]:pp('Rear sight notch',[(542,155),(550,137),(561,135),(571,160)],.082,dark,'rear_sight',side*.072,.009)
        pp('Exposed hammer exterior',[(611,182),(624,158),(645,151),(655,158),(648,177),(628,202)],.12,edge,'rear',bevel=.013)
        cylinder('Hammer inset',((640-350)/170,0,(350-166)/170),.035,.123,black,'rear','Y')
        for side in [-1,1]:
            pp('Side lever exterior',[(530,195),(582,194),(593,204),(586,214),(534,214),(525,209)],.034,black,'controls',side*.266,.009)
            pp('Frame lever exterior',[(404,261),(454,258),(478,264),(487,270),(472,278),(405,277)],.032,edge,'controls',side*.255,.009)
            cylinder('Round frame button',((494-350)/170,side*.27,(350-366)/170),.088,.026,edge,'controls','Y')
        label('PIETRO BERETTA   92 FS',(-1.44,-.241,.736),.061,engraving,'slide')
        barrel_anchor=(-1.91,1.045,0)
    else:
        origin=(940,620);scale=380
        rounded_slide('Rounded 1911 steel slide',-1.99,1.53,.68,1.12,.43,steel)
        pp('Steel frame profile',[(190,355),(1460,362),(1506,399),(1560,401),(1619,438),(1602,484),(1526,481),(1481,461),(1420,470),(1360,446),(1246,414),(1199,432),(1161,441),(1147,489),(1118,518),(897,474),(816,462),(491,460),(481,445),(191,445)],.40,steel,'frame',bevel=.019)
        grip_pts=[(1232,418),(1390,426),(1519,474),(1556,492),(1730,1069),(1713,1098),(1373,1141),(1344,1124),(1213,776),(1155,679),(1132,631),(1137,562),(1168,489)]
        pp('Steel grip frame',grip_pts,.40,steel,'grip',bevel=.04)
        panel=[(1230,453),(1335,424),(1458,462),(1658,1068),(1379,1111),(1305,844),(1198,554)]
        for side in [-1,1]:
            pp('Walnut grip panel',panel,.055,wood,'grip',side*.226,.025)
            panel_pattern(panel,side*.258,wood,step=.045)
            for px,pz in [(1334,492),(1535,1004)]:
                pos=((px-940)/380,side*.267,(620-pz)/380)
                cylinder('Polished grip screw',pos,.065,.012,silver,'grip','Y')
                box('Fine screw slot',(pos[0],side*.278,pos[2]),(.095,.004,.008),black,'grip',.001,-.25)
        ring('Round steel trigger guard',[(863,462),(932,461),(1080,468),(1157,485),(1180,532),(1177,623),(1131,669),(948,676),(878,647),(853,570)],[(882,482),(939,478),(1074,483),(1137,496),(1162,535),(1157,614),(1120,648),(956,655),(898,631),(872,571)],.27,steel,'guard')
        pp('Short curved trigger face',[(1097,485),(1150,486),(1158,517),(1153,587),(1117,646),(1089,652),(1115,602),(1119,533)],.15,steel,'trigger',bevel=.014)
        pp('Magazine exterior',[(1280,695),(1467,647),(1584,1108),(1365,1140)],.27,edge,'magazine',bevel=.018)
        pp('Thin magazine floor plate',[(1330,1130),(1667,1082),(1681,1106),(1340,1155)],.39,steel,'magazine',bevel=.011)
        serrations(.72,18,.032,.851,.221,.39,edge)
        cylinder('Barrel exterior front',(-.63,0,.906),.121,2.87,silver,'barrel')
        cylinder('Closed dark muzzle recess',(-2.072,0,.906),.085,.003,black,'barrel')
        cylinder('Front lower exterior cap',(-1.95,0,.58),.082,.23,edge,'frame')
        pp('Front rounded sight',[(213,191),(221,175),(239,162),(260,163),(274,176),(280,193)],.068,dark,'front_sight',bevel=.012)
        for side in [-1,1]:pp('Rear sight shoulder',[(1385,202),(1398,176),(1403,151),(1420,151),(1429,181),(1445,204)],.075,dark,'rear_sight',side*.08,.008)
        pp('Spur hammer exterior',[(1506,236),(1548,239),(1591,224),(1621,224),(1637,232),(1629,248),(1584,272),(1560,293),(1517,273)],.12,steel,'rear',bevel=.012)
        for side in [-1,1]:
            pp('Side lever exterior',[(1200,381),(1271,381),(1282,405),(1257,416),(1196,410)],.035,steel,'controls',side*.228,.009)
            pp('Slide stop exterior',[(950,380),(1031,377),(1084,383),(1098,400),(1085,416),(960,428),(941,416)],.03,steel,'controls',side*.225,.009)
            cylinder('Frame button',((1190-940)/380,side*.227,(620-601)/380),.065,.014,edge,'controls','Y')
        label('GOVERNMENT  MODEL',(-.84,-.225,.88),.059,engraving,'slide')
        label('COLT   .45',(-.47,-.225,.80),.064,engraving,'slide')
        barrel_anchor=(-2.07,.906,0)
    # Closed superficial side inset: external visual cue only, no chamber cavity.
    if key!='92fs':
        box('Upper exterior recess',(.37,.205,.99),(.44,.018,.12),black,'slide',.021)
        box('Recess interior surface',(.37,.217,.99),(.35,.007,.075),edge,'slide',.012)
    # Individual editable meshes are retained in .blend; GLB groups carry region IDs.
    scene['notice']='Non-functional digital exhibit. Artistic units. Exterior observation groups, not an assembly model.'
    scene['reference_note']='Based on cited manufacturer exterior photography. No photo assets are redistributed.'
    world=bpy.data.worlds.new('Atlas studio');world.use_nodes=True;scene.world=world
    back=next(n for n in world.node_tree.nodes if n.type=='BACKGROUND');back.inputs[0].default_value=(.11,.13,.16,1);back.inputs[1].default_value=.35
    for name,pos,power,size in [('Softbox',(-3,-4,5),600,4),('Rim',(2,3,4),900,3),('Fill',(4,-2,1),240,3)]:
        d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='RECTANGLE';d.size=size;d.size_y=size*.6
        o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=pos;o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler()
    camera=bpy.data.cameras.new('Exhibit camera');cam=bpy.data.objects.new('Exhibit camera',camera);scene.collection.objects.link(cam)
    cam.location=(-3.4,-8,2.7);cam.rotation_euler=(Vector((0,0,-.05))-cam.location).to_track_quat('-Z','Y').to_euler();camera.type='ORTHO';camera.ortho_scale=5.1;scene.camera=cam
    scene.render.engine='CYCLES';scene.cycles.samples=40;scene.cycles.use_denoising=True
    scene.render.resolution_x=1200;scene.render.resolution_y=900;scene.render.resolution_percentage=100;scene.render.film_transparent=True
    scene.view_settings.view_transform='AgX';scene.render.image_settings.file_format='PNG';scene.render.filepath='//../public/images/'+key+'.png'
    # Pack the generated surface textures into the independent source scene.
    for im in bpy.data.images:
        if im.source=='FILE' and im.filepath and not im.packed_file:im.pack()
    bpy.data.libraries.write(str(ROOT/'models'/f'{key}.blend'),{scene},fake_user=True,compress=True)
    bpy.ops.object.select_all(action='DESELECT')
    for part in groups.values():
        part.select_set(True)
        for o in part.children:o.select_set(True)
    bpy.context.view_layer.objects.active=groups['slide']
    bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/models'/f'{key}.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_apply=True,export_extras=True,export_yup=True)
    report.append({'model':key,'regions':PARTS,'objects':sum(o.type=='MESH' for o in scene.objects),'glb_bytes':(ROOT/'public/models'/f'{key}.glb').stat().st_size,'muzzle':barrel_anchor})
bpy.context.window.scene=original_scene
(ROOT/'reports/models.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report))
