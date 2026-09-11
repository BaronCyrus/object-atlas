"""Original procedural surface maps; no reference photographs are redistributed."""
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter
ROOT=Path(__file__).resolve().parents[1]/'public/textures';ROOT.mkdir(exist_ok=True)
rng=np.random.default_rng(917);n=1024
x,y=np.meshgrid(np.arange(n),np.arange(n))
def normal(height,strength):
    dy,dx=np.gradient(height.astype(float));v=np.stack([-dx*strength,-dy*strength,np.ones_like(dx)],-1);v/=np.linalg.norm(v,axis=-1,keepdims=True)
    return ((v*.5+.5)*255).astype('uint8')
for kind in ['polymer','rubber','wood','steel']:
    noise=rng.normal(0,1,(n,n));sm=np.asarray(Image.fromarray(np.uint8(np.clip(128+noise*35,0,255))).filter(ImageFilter.GaussianBlur(4.0))).astype(float)/255
    if kind in ['polymer','rubber']:
        sm=np.asarray(Image.fromarray(np.uint8(rng.random((128,128))*255)).resize((n,n),Image.Resampling.BICUBIC)).astype(float)/255
        grain=(sm-.5)*.85
        check=(np.sin((x+y)*.23)*np.sin((x-y)*.23))*.06 if kind=='rubber' else 0
        height=grain+check
        color=np.stack([np.full((n,n),34),np.full((n,n),37),np.full((n,n),37)],-1)+(sm[:,:,None]-.5)*18+noise[:,:,None]*1.1
        rough=np.clip(184+sm*24,0,255)
    elif kind=='wood':
        grain=np.sin(x*.052+np.sin(y*.013)*3+np.sin(x*.014+y*.004)*4)
        pores=np.sin(x*.28+np.sin(y*.007)*6+noise*.25)
        height=grain*.055+pores*.025+noise*.016
        color=np.stack([76+grain*15+pores*4,30+grain*8+pores*2,14+grain*4],-1)
        rough=160+sm*25
    else:
        height=sm*.12+np.sin(y*1.3)*.025
        color=np.stack([np.full((n,n),180),np.full((n,n),182),np.full((n,n),181)],-1)+noise[:,:,None]*2
        rough=130+sm*25
    Image.fromarray(np.uint8(np.clip(color,0,255))).save(ROOT/f'{kind}-color.jpg',quality=90)
    Image.fromarray(normal(height,5.0 if kind=='polymer' else 2.3)).save(ROOT/f'{kind}-normal.png',optimize=True)
    Image.fromarray(np.uint8(rough)).save(ROOT/f'{kind}-roughness.jpg',quality=88)
print('12 original surface maps written')
