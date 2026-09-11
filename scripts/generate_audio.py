"""Render project-written Mandarin narration with the Apache-2.0 Kokoro model."""
from pathlib import Path
import json,subprocess,tempfile
import numpy as np
import soundfile as sf
import torch
from kokoro import KPipeline
ROOT=Path(__file__).resolve().parents[1]
manifest=json.loads((ROOT/'public/audio/narration.json').read_text())
torch.set_num_threads(4)
pipeline=KPipeline(lang_code='z',repo_id=manifest['model'],device='cpu')
records=[]
for key,text in manifest['clips'].items():
    chunks=[r.audio.numpy() for r in pipeline(text,voice=manifest['voice'],speed=.91)]
    samples=np.concatenate([np.zeros(1800,dtype=np.float32),*chunks,np.zeros(3000,dtype=np.float32)])
    with tempfile.NamedTemporaryFile(suffix='.wav') as wav:
        sf.write(wav.name,samples,24000)
        out=ROOT/'public/audio'/f'{key}.mp3'
        subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',wav.name,'-codec:a','libmp3lame','-b:a','72k',str(out)],check=True)
    records.append({'id':key,'duration':round(len(samples)/24000,3),'bytes':out.stat().st_size})
    print(key,records[-1]['duration'],flush=True)
(ROOT/'reports/audio.json').write_text(json.dumps(records,indent=2))
