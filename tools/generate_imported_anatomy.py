"""Generate an original schematic GlucoTwin anatomy asset.

Editable source, no external meshes/textures. Anatomical relationships guide
placement, but the generated geometry has not received anatomical expert review.
Run with .venv/Scripts/python.exe scripts/generate_anatomy.py.
"""
from pathlib import Path
import hashlib
import json
import math
import struct
import time

import numpy as np
from scipy.interpolate import CubicSpline
from skimage.measure import marching_cubes
import trimesh
from trimesh.visual.material import PBRMaterial

OUT = Path(__file__).resolve().parents[1] / 'public' / 'models'
OUT.mkdir(parents=True, exist_ok=True)
COLORS = {
    'body_shell': ('#c4bcb1', .65), 'pancreas': ('#c9a384', .53),
    'liver': ('#71382f', .38), 'gut': ('#d59b94', .42),
    'muscle': ('#9d4944', .62), 'fat': ('#e3c374', .65),
    'bone_landmarks': ('#e4dac5', .70),
}


def material(key):
    color, rough = COLORS[key]
    rgba = np.array([int(color[i:i+2], 16) for i in (1, 3, 5)] + [255])
    return PBRMaterial(name='mat_' + key, baseColorFactor=rgba,
                       roughnessFactor=rough, metallicFactor=0.,
                       emissiveFactor=[0., 0., 0.], alphaMode='OPAQUE')


class Field:
    """Smooth unions of true-sized ellipsoids and tapered limb capsules."""
    def __init__(self, lo, hi, step):
        self.lo = np.array(lo)
        self.axes = [np.arange(lo[i], hi[i] + step, step, dtype=np.float32) for i in range(3)]
        self.step = step
        self.values = np.full(tuple(len(a) for a in self.axes), .5, np.float32)

    def region(self, lo, hi):
        sl = tuple(slice(max(0, int((lo[i]-self.lo[i])/self.step)),
                         min(len(self.axes[i]), int((hi[i]-self.lo[i])/self.step)+2)) for i in range(3))
        xyz = np.meshgrid(*(self.axes[i][sl[i]] for i in range(3)), indexing='ij')
        return sl, xyz

    def union(self, slices, d, blend):
        old = self.values[slices]
        if blend:
            h = np.maximum(blend - np.abs(old-d), 0.) / blend
            d = np.minimum(old, d) - h*h*h*blend/6.
        else:
            d = np.minimum(old, d)
        self.values[slices] = d

    def ellipsoid(self, center, radii, blend=.018, angle=0.):
        c, r = np.array(center), np.array(radii)
        extent = np.array([max(r[0], r[1]), max(r[0], r[1]), r[2]]) + blend*1.2
        sl, xyz = self.region(c-extent, c+extent)
        x, y, z = [xyz[i]-c[i] for i in range(3)]
        if angle:
            co, si = math.cos(angle), math.sin(angle)
            x, y = co*x + si*y, -si*x + co*y
        k0 = np.sqrt((x/r[0])**2+(y/r[1])**2+(z/r[2])**2)
        k1 = np.sqrt((x/r[0]**2)**2+(y/r[1]**2)**2+(z/r[2]**2)**2)
        d = k0*(k0-1.) / np.maximum(k1, 1e-7)
        self.union(sl, d, blend)

    def capsule(self, p0, p1, r0, r1=None, blend=.015):
        p0, p1 = np.array(p0), np.array(p1)
        r1 = r0 if r1 is None else r1
        radius = max(r0, r1) + blend*1.2
        sl, xyz = self.region(np.minimum(p0,p1)-radius, np.maximum(p0,p1)+radius)
        q = [xyz[i]-p0[i] for i in range(3)]
        delta = p1-p0
        t = np.clip(sum(q[i]*delta[i] for i in range(3))/np.dot(delta,delta),0.,1.)
        d = np.sqrt(sum((q[i]-t*delta[i])**2 for i in range(3))) - (r0+(r1-r0)*t)
        self.union(sl,d,blend)

    def mesh(self, perturb=0.):
        field = self.values
        if perturb:
            x,y,z = np.meshgrid(*self.axes,indexing='ij')
            field = field + perturb*(np.sin(x*590)*np.sin(y*670)*np.sin(z*540) + .35*np.sin((x+y)*950))
        v, f, _, _ = marching_cubes(field,level=0.,spacing=(self.step,)*3,allow_degenerate=False)
        mesh = trimesh.Trimesh(v+self.lo, f, process=True)
        trimesh.repair.fix_normals(mesh)
        if mesh.volume<0:
            mesh.invert()
        return mesh


def tube(points, radius, sides=12, oval=1., ripple=0.):
    """Connected tube with smoothly oriented rings and capped ends."""
    pts = np.asarray(points,dtype=float)
    radii = np.full(len(pts),radius) if np.isscalar(radius) else np.asarray(radius)
    tangents = np.gradient(pts,axis=0)
    tangents /= np.linalg.norm(tangents,axis=1)[:,None]
    v = []
    for i,(p,t) in enumerate(zip(pts,tangents)):
        ref = np.array([0.,0.,1.]) if abs(t[2])<.9 else np.array([0.,1.,0.])
        n = np.cross(t,ref); n /= np.linalg.norm(n)
        b = np.cross(t,n)
        for j in range(sides):
            a=2*np.pi*j/sides
            rr=radii[i]*(1+ripple*np.sin(i*.7+j*2.3))
            v.append(p+rr*(np.cos(a)*n+oval*np.sin(a)*b))
    faces=[]
    for i in range(len(pts)-1):
        for j in range(sides):
            a=i*sides+j; b=i*sides+(j+1)%sides
            c=(i+1)*sides+j; d=(i+1)*sides+(j+1)%sides
            faces.extend([[a,c,b],[b,c,d]])
    v.extend([pts[0],pts[-1]])
    for j in range(sides):
        faces.append([len(v)-2,j,(j+1)%sides])
        a=(len(pts)-1)*sides
        faces.append([len(v)-1,a+(j+1)%sides,a+j])
    mesh=trimesh.Trimesh(v,faces,process=True)
    trimesh.repair.fix_normals(mesh)
    return mesh


def ellipsoid_mesh(center,radii,subdivisions=3,angle=0.):
    m=trimesh.creation.icosphere(subdivisions=subdivisions,radius=1.)
    m.apply_scale(radii)
    if angle:m.apply_transform(trimesh.transformations.rotation_matrix(angle,[0,0,1]))
    m.apply_translation(center)
    return m


scene=trimesh.Scene(base_frame='world')
scene.graph.update(frame_to='GlucoTwin_Anatomy',frame_from='world')


def group(name,parent='GlucoTwin_Anatomy',organ=None):
    metadata = {'organId':organ,'role':'anatomy','selectable':True} if organ else {}
    scene.graph.update(frame_to=name,frame_from=parent,metadata=metadata)


def add(name,mesh,parent,key):
    mesh.visual=trimesh.visual.TextureVisuals(material=material(key))
    scene.add_geometry(mesh,node_name=name,geom_name=name,parent_node_name=parent)
    return mesh


def build_shell():
    f=Field([-.49,-.005,-.17],[.49,1.755,.23],.0065)
    # Torso volumes blend into a smooth continuous surface.
    f.ellipsoid([0,1.288,.006],[.176,.165,.105],.036)
    f.ellipsoid([0,1.129,.010],[.139,.145,.092],.04)
    f.ellipsoid([0,.982,-.003],[.160,.107,.101],.034)
    f.ellipsoid([-.073,.967,-.04],[.088,.084,.083],.026)
    f.ellipsoid([.073,.967,-.04],[.088,.084,.083],.026)
    # Trapezius/neck and full skull/jaw, no face texture.
    f.ellipsoid([0,1.432,-.005],[.111,.065,.067],.032)
    f.capsule([0,1.43,0],[0,1.512,0],.052,.046,.02)
    f.ellipsoid([0,1.640,-.005],[.076,.109,.080],.016)
    f.ellipsoid([0,1.566,.017],[.060,.055,.061],.018)
    f.ellipsoid([0,1.546,.030],[.045,.027,.041],.012)
    f.ellipsoid([0,1.614,.070],[.013,.029,.020],.009)
    f.ellipsoid([0,1.594,.079],[.016,.012,.015],.008)
    for s in [-1,1]:
        # Ear, cheeks and subtle brow planes.
        f.ellipsoid([s*.077,1.620,-.002],[.013,.027,.013],.008)
        f.ellipsoid([s*.035,1.605,.057],[.029,.027,.021],.008)
        f.ellipsoid([s*.029,1.642,.060],[.028,.010,.016],.007)
        # Shoulder and arm, subtly abducted from the torso.
        f.ellipsoid([s*.177,1.386,0],[.060,.065,.064],.025)
        f.capsule([s*.186,1.377,0],[s*.276,1.185,.001],.051,.037,.023)
        f.capsule([s*.276,1.185,.001],[s*.344,1.005,.018],.037,.023,.018)
        f.ellipsoid([s*.350,.961,.018],[.028,.052,.014],.011,angle=s*.30)
        # Separated fingers and thumb. Capsule tips round naturally.
        for j in range(4):
            xx=s*(.332+j*.013)
            yy=.935+(abs(j-1.4)*.003)
            end=.881+(abs(j-1.4)*.009)
            f.capsule([xx,yy,.020],[xx+s*.012,end,.024],.0062,.0048,.003)
        f.capsule([s*.330,.982,.018],[s*.309,.946,.029],.009,.006,.005)
        # Each leg flows from pelvis through thigh/knee/calf/ankle.
        f.capsule([s*.086,.937,-.002],[s*.103,.563,.002],.076,.048,.025)
        f.ellipsoid([s*.104,.553,.010],[.047,.055,.046],.014)
        f.capsule([s*.105,.548,-.002],[s*.115,.164,-.013],.047,.029,.016)
        f.ellipsoid([s*.111,.409,-.024],[.045,.114,.047],.015)
        f.capsule([s*.115,.192,-.010],[s*.116,.079,-.005],.030,.027,.012)
        f.ellipsoid([s*.116,.044,.044],[.043,.038,.095],.013,angle=s*.015)
        f.ellipsoid([s*.116,.033,.104],[.045,.026,.045],.009)
    m=f.mesh()
    # Smooth only sub-grid irregularity; preserve silhouette and finger gaps.
    trimesh.smoothing.filter_taubin(m,lamb=.35,nu=.37,iterations=3)
    add('shell_full_body',m,'body_shell','body_shell')


def build_organs():
    # Pancreas is posterior to stomach. Its head is on patient-right (-X).
    f=Field([-.126,1.075,-.073],[.131,1.207,.022],.0028)
    f.ellipsoid([-.081,1.137,-.025],[.025,.035,.021],.013)
    f.ellipsoid([-.061,1.119,-.025],[.020,.015,.014],.010)
    for t in np.linspace(0,1,16):
        x=-.073+.187*t
        y=1.151+.023*t+.005*np.sin(t*np.pi)
        z=-.025-.009*t
        r=.018*(1-t)+.008*t
        f.ellipsoid([x,y,z],[.018,r,r*.8],.008)
    add('pancreas_surface',f.mesh(perturb=.0012),'pancreas','pancreas')
    # Liver: broad right lobe and tapered left lobe form one coherent volume.
    f=Field([-.18,1.165,-.067],[.102,1.329,.112],.0038)
    f.ellipsoid([-.075,1.246,.018],[.084,.063,.061],.023,angle=-.16)
    f.ellipsoid([.010,1.254,.025],[.073,.036,.045],.020,angle=-.24)
    f.ellipsoid([-.056,1.205,.031],[.069,.022,.045],.020)
    add('liver_surface',f.mesh(),'liver','liver')
    # Stomach: superior fundus, body, and narrow pyloric outlet.
    f=Field([-.071,1.118,-.004],[.143,1.293,.116],.0035)
    f.ellipsoid([.064,1.236,.053],[.043,.053,.036],.017,angle=-.27)
    f.ellipsoid([.052,1.196,.065],[.037,.057,.035],.018,angle=-.42)
    f.ellipsoid([.013,1.159,.060],[.039,.024,.023],.015,angle=-.2)
    f.ellipsoid([-.028,1.161,.042],[.023,.016,.016],.012)
    add('stomach',f.mesh(),'gut','gut')
    esophagus=np.array([[.028,1.324,.003],[.033,1.296,.012],[.041,1.272,.028],[.053,1.258,.042]])
    add('esophagus_lower',tube(esophagus,.010,12),'gut','gut')
    # C-loop encloses pancreatic head on patient-right before descending.
    a=np.linspace(np.pi/2,3*np.pi/2,46)
    curve=np.column_stack([-.080+.038*np.cos(a),1.139+.045*np.sin(a),np.full(len(a),.003)])
    curve=np.vstack([[ -.044,1.168,.032],[-.068,1.183,.011],curve,[-.060,1.088,.001],[-.021,1.080,.010]])
    add('duodenum',tube(curve,.011,12),'gut','gut')
    # One continuous folded bowel path. Irregular turns and changing depth avoid
    # the stacked horizontal-row appearance of a schematic descending helix.
    controls=np.array([
        [-.022,1.077,.015],[.035,1.075,.035],[.070,1.052,.050],
        [.095,1.018,.055],[.072,.990,.062],[.040,1.005,.064],
        [.035,1.042,.061],[.003,1.055,.067],[-.035,1.028,.066],
        [-.065,1.048,.052],[-.095,1.025,.040],[-.085,.980,.045],
        [-.049,.962,.048],[-.025,.989,.045],[-.030,1.017,.040],
        [.006,1.025,.027],[.020,.990,.025],[.055,.962,.025],
        [.075,.944,.018],[.040,.932,.009],[.003,.940,.005],
        [-.018,.961,.008],[-.045,.943,.007],[-.080,.950,.015],
    ])
    parameter=np.concatenate([[0],np.cumsum(np.linalg.norm(np.diff(controls,axis=0),axis=1))])
    p=CubicSpline(parameter,controls,axis=0,bc_type='natural')(np.linspace(0,parameter[-1],250))
    add('small_intestine',tube(p,.0095,12,ripple=.015),'gut','gut')


def build_tissues():
    for s,label in [(-1,'right'),(1,'left')]:
        add('upper_arm_'+label,ellipsoid_mesh([s*.232,1.281,.012],[.031,.102,.026],3,angle=s*.42),'muscle','muscle')
        add('thigh_'+label,ellipsoid_mesh([s*.095,.759,.020],[.047,.142,.035],3,angle=s*.04),'muscle','muscle')
        # Soft non-total illustrative abdominal adipose patches.
        f=Field([s*.076-.055,1.003,.049],[s*.076+.055,1.148,.112],.0045)
        f.ellipsoid([s*.076,1.075,.078],[.047,.061,.013],.014,angle=s*.10)
        add('abdominal_fat_'+label,f.mesh(perturb=.0009),'fat','fat')


def main():
    start=time.time()
    for name in ['body_shell','organs','tissues','anchors']:group(name)
    for name in ['pancreas','liver','gut']:group(name,'organs',name)
    for name in ['muscle','fat']:group(name,'tissues',name)
    build_shell(); build_organs(); build_tissues()
    # Put soles at precisely Y=0 without introducing a nonidentity root transform.
    sole_height=float(scene.bounds[0,1])
    for mesh in scene.geometry.values():
        mesh.apply_translation([0.,-sole_height,0.])
    anchors={
        'body':[0,.89,0], 'pancreas':[-.005,1.153,-.025],
        'liver':[-.066,1.248,.024], 'gut':[.028,1.115,.042],
        'muscle':[-.095,.76,.02], 'fat':[.076,1.075,.078],
    }
    for key,pos in anchors.items():
        pos[1]-=sole_height
        matrix=np.eye(4);matrix[:3,3]=pos
        scene.graph.update(frame_to='anchor_'+key,frame_from='anchors',matrix=matrix)
    glb=trimesh.exchange.gltf.export_glb(scene,include_normals=True)
    target=OUT/'glucotwin_anatomy.glb';target.write_bytes(glb)
    json_length,json_type=struct.unpack_from('<II',glb,12)
    data=json.loads(glb[20:20+json_length])
    # Bind selectable metadata directly to group nodes for portable loaders.
    for node in data['nodes']:
        if node.get('name') in ['pancreas','liver','gut','muscle','fat']:
            node['extras']={'organId':node['name'],'role':'anatomy','selectable':True}
    # glTF baseColorFactor is linear-light; source palette hexes are sRGB.
    # Set exact floats here instead of relying on 8-bit material conversion.
    for mat in data.get('materials',[]):
        name=mat.get('name','').removeprefix('mat_')
        if name in COLORS:
            color=COLORS[name][0]
            srgb=np.array([int(color[i:i+2],16)/255 for i in (1,3,5)])
            linear=np.where(srgb<=.04045,srgb/12.92,((srgb+.055)/1.055)**2.4)
            mat['pbrMetallicRoughness']['baseColorFactor']=linear.tolist()+[1.]
    encoded=json.dumps(data,separators=(',',':')).encode()
    encoded+=b' '*((-len(encoded))%4)
    rest=glb[20+json_length:]
    glb=struct.pack('<4sII',b'glTF',2,20+len(encoded)+len(rest))+struct.pack('<I4s',len(encoded),b'JSON')+encoded+rest
    target.write_bytes(glb)
    triangles=sum(len(m.faces) for m in scene.geometry.values())
    stats={'triangles':triangles,'meshes':len(scene.geometry),'materials':len(data.get('materials',[])),
           'textures':len(data.get('textures',[])),'bytes':len(glb),'sha256':hashlib.sha256(glb).hexdigest(),
           'bounds':scene.bounds.tolist(),'generationSeconds':round(time.time()-start,2)}
    manifest={'schemaVersion':1,'asset':target.name,'units':'meters','standingHeight':1.75,
              'axes':{'up':'+Y','anterior':'+Z','patientLeft':'+X'},'rootNode':'GlucoTwin_Anatomy',
              'shellNode':'body_shell','organGroups':{k:{'node':k,'anchor':'anchor_'+k} for k in ['pancreas','liver','gut','muscle','fat']},
              'anchors':anchors,'optionalContextNodes':[],'anatomicalReviewStatus':'not_expert_reviewed',
              'representation':'original procedurally generated educational schematic, not a patient scan',
              'stats':stats}
    (OUT/'anatomy_manifest.json').write_text(json.dumps(manifest,indent=2))
    (OUT/'ATTRIBUTION.md').write_text('# Asset provenance\n\nOriginal procedural geometry generated for this GlucoTwin prototype. No external meshes or textures. Editable source: scripts/generate_anatomy.py. Dependencies: NumPy, scikit-image, SciPy and trimesh. Smooth surfaces use signed-distance fields and marching cubes. Educational schematic; not anatomically expert-reviewed, clinically validated or patient-specific.\n')
    (OUT/'README.md').write_text('# GlucoTwin anatomy prototype\n\nSelf-contained uncompressed glTF 2.0 GLB. Units meters, +Y up, +Z anterior, +X patient-left. Named groups and anchors documented in anatomy_manifest.json. Tissue surfaces use non-emissive PBR materials; runtime controls shell transparency and organ context fading. Pancreas sits posterior to stomach; liver primarily patient-right. Generated anatomy is schematic and needs expert review.\n\nThe five organ/tissue groups remain independently controllable. Representative muscle/adipose patches are illustrative subsets. No glucose graphics, UI, lights, cameras or stage are baked into the model.\n\nStatistics:\n\n```json\n'+json.dumps(stats,indent=2)+'\n```\n')
    print(json.dumps(stats,indent=2),flush=True)
    print('nodes:',[n.get('name') for n in data['nodes']],flush=True)


if __name__=='__main__':main()

