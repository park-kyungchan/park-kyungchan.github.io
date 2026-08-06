#!/usr/bin/env python3
from __future__ import annotations
import hashlib, io, json, pathlib, shutil, subprocess
from PIL import Image, ImageChops, ImageDraw, ImageFont, ImageStat
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
BASE=ROOT/'parent_baseline/P003_R008_Two_Panel_Spatial_Lab_Standalone.html'
CAND=ROOT/'P003_R009_Integrated_Spatial_Revolution_Lab_Standalone.html'
BASE_HTML=BASE.read_text(encoding='utf-8'); CAND_HTML=CAND.read_text(encoding='utf-8')
BASE_DIR=ROOT/'evidence/baseline'; CAND_DIR=ROOT/'evidence/candidate'; FRAME_DIR=ROOT/'evidence/motion_frames'
for d in [BASE_DIR,CAND_DIR,FRAME_DIR]: d.mkdir(parents=True,exist_ok=True)
for f in list(FRAME_DIR.glob('*.png'))+list(FRAME_DIR.glob('*.jpg')): f.unlink()

def dismiss(page):
 page.wait_for_timeout(250)
 if page.locator('#studentStartDialog').evaluate('(e)=>e.open'): page.locator('#startExploreButton').click();page.wait_for_timeout(100)
def tab(page,name): page.eval_on_selector(f'.tab-button[data-tab="{name}"]','e=>e.click()');page.wait_for_timeout(160)
def fill_range(page,sel,value): page.eval_on_selector(sel,'(e,v)=>{e.value=String(v);e.dispatchEvent(new Event(\"input\",{bubbles:true}))}',value);page.wait_for_timeout(140)
def diff(a,b):
 ia=Image.open(io.BytesIO(a)).convert('RGB');ib=Image.open(io.BytesIO(b)).convert('RGB');
 if ia.size!=ib.size:ib=ib.resize(ia.size)
 return sum(ImageStat.Stat(ImageChops.difference(ia,ib)).mean)/3

def capture(page,path): page.screenshot(path=str(path),full_page=False)

baseline_camera_diff=None
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-gpu-sandbox','--use-gl=swiftshader'])
 # Baseline
 page=browser.new_page(viewport={'width':1440,'height':900});page.set_default_timeout(8000);page.set_content(BASE_HTML,wait_until='load');dismiss(page)
 baseline_tab_count=page.locator('.tab-button').count();baseline_dock_count=page.locator('#centerLearningDock').count();baseline_transport_count=page.locator('.r008-transport').count()
 tab(page,'revolution');
 if page.locator('#revolutionProgress').count(): fill_range(page,'#revolutionProgress',62)
 capture(page,BASE_DIR/'R008_07_revolution_floating_transport.png')
 target=page.locator('#r008SpatialCanvas') if page.locator('#r008SpatialCanvas').count() else page.locator('#viewerStage')
 before=target.screenshot();box=target.bounding_box();page.mouse.move(box['x']+box['width']*.55,box['y']+box['height']*.55);page.mouse.down();page.mouse.move(box['x']+box['width']*.68,box['y']+box['height']*.45,steps=7);page.mouse.up();page.wait_for_timeout(120);after=target.screenshot();baseline_camera_diff=diff(before,after)
 tab(page,'revsection');
 if page.locator('#revSectionProgress').count(): fill_range(page,'#revSectionProgress',72)
 capture(page,BASE_DIR/'R008_08_section_fixed_canvas.png')
 page.close()
 # Candidate static evidence
 page=browser.new_page(viewport={'width':1440,'height':900});page.set_default_timeout(8000);page.set_content(CAND_HTML,wait_until='load');dismiss(page)
 tab(page,'revolution');page.locator('#revolutionProfileSelect').select_option('frustum');fill_range(page,'#revolutionProgress',.62);capture(page,CAND_DIR/'R009_07_frustum_generation.png')
 page.locator('#revolutionProfileSelect').select_option('triple_stack');fill_range(page,'#revolutionProgress',.78);capture(page,CAND_DIR/'R009_07_composite_generation.png')
 tab(page,'revsection');page.locator('#revSectionCaseSelect').select_option('CYLINDER-OBLIQUE-CAPS');fill_range(page,'#revSectionProgress',.72);capture(page,CAND_DIR/'R009_08_integrated_section_locus.png')
 tab(page,'geodesic');page.locator('#pathCaseSelect').select_option('cylinder');fill_range(page,'#pathProgress',.72);capture(page,CAND_DIR/'R009_09_integrated_distance_unfold.png')
 # Motion evidence: deterministic sampling of the same exact state graph used by autoplay/direct controls.
 page.close(); page=browser.new_page(viewport={'width':1180,'height':738});page.set_default_timeout(8000);page.set_content(CAND_HTML,wait_until='load');dismiss(page)
 frame_index=[0]
 def frames_for(tab_name,select_sel,select_value,range_sel,count=24,orbit=False):
  tab(page,tab_name)
  if select_sel: page.locator(select_sel).select_option(select_value);page.wait_for_timeout(100)
  for i in range(count):
   v=i/(count-1);fill_range(page,range_sel,v)
   if orbit and i==count//2:
    canvas=page.locator('#glCanvas');b=canvas.bounding_box();page.mouse.move(b['x']+b['width']*.57,b['y']+b['height']*.56);page.mouse.down();page.mouse.move(b['x']+b['width']*.66,b['y']+b['height']*.49,steps=5);page.mouse.up();page.wait_for_timeout(60)
   page.screenshot(path=str(FRAME_DIR/f'frame_{frame_index[0]:04d}.jpg'),type='jpeg',quality=78,full_page=False);frame_index[0]+=1
 frames_for('revolution','#revolutionProfileSelect','triple_stack','#revolutionProgress',8,True)
 frames_for('revsection','#revSectionCaseSelect','CYLINDER-OBLIQUE-CAPS','#revSectionProgress',8,True)
 frames_for('geodesic','#pathCaseSelect','cylinder','#pathProgress',8,True)
 page.close();browser.close()

# Contact sheet
items=[
 (BASE_DIR/'R008_07_revolution_floating_transport.png','R008 / duplicate floating transport'),
 (CAND_DIR/'R009_07_frustum_generation.png','R009 / frustum generation'),
 (CAND_DIR/'R009_07_composite_generation.png','R009 / composite profile'),
 (BASE_DIR/'R008_08_section_fixed_canvas.png','R008 / separate fixed section canvas'),
 (CAND_DIR/'R009_08_integrated_section_locus.png','R009 / section + locus, shared 3D stage'),
 (CAND_DIR/'R009_09_integrated_distance_unfold.png','R009 / distance + unfold, shared 3D stage'),
]
thumb_w,thumb_h,cap_h=700,438,42
sheet=Image.new('RGB',(thumb_w*3, (thumb_h+cap_h)*2),(244,247,252));draw=ImageDraw.Draw(sheet)
try: font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',18)
except Exception: font=ImageFont.load_default()
for idx,(path,label) in enumerate(items):
 im=Image.open(path).convert('RGB');im.thumbnail((thumb_w,thumb_h),Image.Resampling.LANCZOS)
 canvas=Image.new('RGB',(thumb_w,thumb_h),'white');canvas.paste(im,((thumb_w-im.width)//2,(thumb_h-im.height)//2))
 x=(idx%3)*thumb_w;y=(idx//3)*(thumb_h+cap_h);sheet.paste(canvas,(x,y));draw.rectangle((x,y+thumb_h,x+thumb_w,y+thumb_h+cap_h),fill=(230,237,249));draw.text((x+14,y+thumb_h+10),label,font=font,fill=(25,48,78))
contact=ROOT/'evidence/P003_R009_BEFORE_AFTER_CONTACT_SHEET.png';sheet.save(contact,optimize=True)
# MP4
mp4=ROOT/'evidence/P003_R009_MOTION_EVIDENCE.mp4'
cmd=['ffmpeg','-y','-framerate','6','-i',str(FRAME_DIR/'frame_%04d.jpg'),'-c:v','libx264','-pix_fmt','yuv420p','-crf','22','-movflags','+faststart',str(mp4)]
subprocess.run(cmd,check=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
result={
 'baseline_pack_role':'IMMUTABLE R008 HOLD baseline',
 'baseline_standalone_sha256':hashlib.sha256(BASE.read_bytes()).hexdigest(),
 'baseline_standalone_bytes':BASE.stat().st_size,
 'baseline_tab_count':baseline_tab_count,
 'baseline_center_dock_count':baseline_dock_count,
 'baseline_transport_count':baseline_transport_count,
 'baseline_spatial_drag_mean_pixel_diff':baseline_camera_diff,
 'baseline_findings':[
  'A duplicate floating transport existed in addition to left-side controls.',
  'The chapter model had 12 tabs, separating section/locus and distance/unfold and retaining transfer.',
  'The R008 revolution/section display used a fixed spatial canvas rather than the shared PolyRenderer camera path.'
 ],
 'candidate_standalone_sha256':hashlib.sha256(CAND.read_bytes()).hexdigest(),
 'candidate_standalone_bytes':CAND.stat().st_size,
 'evidence_files':[str(p.relative_to(ROOT)) for p,_ in items]+[str(contact.relative_to(ROOT)),str(mp4.relative_to(ROOT))],
 'motion_frames':frame_index[0],
 'motion_fps':6,
 'motion_duration_seconds':frame_index[0]/6,
 'motion_capture_note':'Full-range deterministic samples from the same progress controls and exact state graph used by autoplay; camera orbit is injected mid-sequence to show interaction continuity.'
}
out=ROOT/'audit/P003_R009_BASELINE_FAILURE_EVIDENCE.json';out.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'contact_sheet':str(contact),'motion':str(mp4),'frames':frame_index[0],'baseline_camera_diff':baseline_camera_diff,'audit':str(out)},ensure_ascii=False))
