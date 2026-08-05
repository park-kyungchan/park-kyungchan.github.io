#!/usr/bin/env python3
from __future__ import annotations
import json, math, pathlib, sys
ROOT=pathlib.Path(__file__).resolve().parents[1]
spec=json.loads((ROOT/'data/P003_R009_EXACT_SPATIAL_SPEC.json').read_text(encoding='utf-8'))
state=json.loads((ROOT/'data/P003_R009_STATE_GRAPH.json').read_text(encoding='utf-8'))
checks=[]
def check(name, cond, actual=None, expected=None):
    checks.append({'id':name,'status':'PASS' if cond else 'FAIL','actual':actual,'expected':expected})

def close(a,b,tol=1e-9): return abs(a-b)<=tol
profiles=spec['revolution_profiles']; groups=spec['revolution_groups']; sections=spec['section_cases']; paths=spec['shortest_paths']
check('R009-DATA-001-profile-count',len(profiles)==10,len(profiles),10)
check('R009-DATA-002-basic-profiles',groups['basic']==['cylinder','cone','frustum','sphere'],groups['basic'],['cylinder','cone','frustum','sphere'])
check('R009-DATA-003-offset-count',len(groups['offset'])==2,len(groups['offset']),2)
check('R009-DATA-004-composite-count',len(groups['composite'])==4,len(groups['composite']),4)
check('R009-DATA-005-frustum-radii',profiles['frustum']['exact']['bottom_radius']>profiles['frustum']['exact']['top_radius']>0,profiles['frustum']['exact'])
# Every offset profile must stay strictly away from the axis in its declared source geometry.
def component_min_radius(component):
    if component['kind']=='polygon': return min(p[0] for p in component['points'])
    if component['kind']=='circle': return component['center'][0]-component['radius']
    return 0
for pid in groups['offset']:
    minimum=min(component_min_radius(c) for c in profiles[pid]['components'])
    check(f'R009-DATA-OFFSET-{pid}',minimum>0,minimum,'> 0')
check('R009-DATA-006-section-count',len(sections)==13,len(sections),13)
ids=[x['case_id'] for x in sections]
check('R009-DATA-007-section-ids-unique',len(ids)==len(set(ids)),len(set(ids)),len(ids))
required_classes={'circle','tangent_point','rectangle','ellipse','curves_and_cap_segments','triangle','trapezoid','annulus','two_circles'}
actual_classes={x['classification'] for x in sections}
check('R009-DATA-008-section-class-coverage',required_classes<=actual_classes,sorted(actual_classes),sorted(required_classes))
sphere=next(x for x in sections if x['case_id']=='SPHERE-OFF-CENTER')
R=profiles['sphere']['exact']['radius']; d=sphere['plane']['d']; expected=math.sqrt(R*R-d*d)
check('R009-MATH-001-sphere-section-radius',close(sphere['exact']['radius'],expected),sphere['exact']['radius'],expected)
axial=next(x for x in sections if x['case_id']=='CYLINDER-AXIAL')
r=profiles['cylinder']['exact']['radius']; dd=axial['plane']['d']; expected_width=2*math.sqrt(r*r-dd*dd)
check('R009-MATH-002-cylinder-axial-width',close(axial['exact']['width'],expected_width),axial['exact']['width'],expected_width)
fr=next(x for x in sections if x['case_id']=='FRUSTUM-HORIZONTAL')
y=fr['plane']['d']; b=profiles['frustum']['exact']; expected_r=b['bottom_radius']+(y+1.5)/3*(b['top_radius']-b['bottom_radius'])
check('R009-MATH-003-frustum-interpolation',close(fr['exact']['radius'],expected_r),fr['exact']['radius'],expected_r)
cube=paths['cube']
check('R009-MATH-004-cube-interior',close(cube['interior_distance'],math.sqrt(3)),cube['interior_distance'],math.sqrt(3))
check('R009-MATH-005-cube-surface',close(cube['surface_distance'],math.sqrt(5)),cube['surface_distance'],math.sqrt(5))
check('R009-MATH-006-cube-edge',close(cube['edge_only_distance'],3),cube['edge_only_distance'],3)
for key,candidates_key,min_key in [('cylinder','periodic_copies','surface_minimum'),('cone','seam_copies','surface_minimum')]:
    item=paths[key]; minimum=min(x['length'] for x in item[candidates_key])
    check(f'R009-MATH-{key}-candidate-min',close(item[min_key],minimum),item[min_key],minimum)
sph=paths['sphere']; expected_chord=2*sph['radius']*math.sin(sph['central_angle']/2); expected_arc=sph['radius']*sph['central_angle']
check('R009-MATH-009-sphere-chord',close(sph['interior_chord'],expected_chord),sph['interior_chord'],expected_chord)
check('R009-MATH-010-sphere-arc',close(sph['surface_short_arc'],expected_arc),sph['surface_short_arc'],expected_arc)
check('R009-STATE-001-chapter-count',state['chapter_count']==9,state['chapter_count'],9)
check('R009-STATE-002-order',spec['chapter_order']==[c['module'] for c in state['chapters']],spec['chapter_order'],[c['module'] for c in state['chapters']])
check('R009-STATE-003-removed',set(state['removed'])=={'locus','distance','transfer'},state['removed'],['locus','distance','transfer'])
check('R009-STATE-004-merged-section',state['merged']['revsection']==['revsection','locus'],state['merged']['revsection'])
check('R009-STATE-005-merged-path',state['merged']['geodesic']==['distance','geodesic'],state['merged']['geodesic'])
check('R009-STATE-006-autoplay-direct-data',state['autoplay_and_direct_same_data'] is True,state['autoplay_and_direct_same_data'],True)
for chapter in ['revolution','revsection','geodesic']:
    item=next(c for c in state['chapters'] if c['module']==chapter)
    check(f'R009-STATE-CAMERA-{chapter}',item['camera_orbit_during_autoplay'] is True,item['camera_orbit_during_autoplay'],True)
result={'suite':'P003-R009-EXACT-VALIDATION','status':'PASS' if all(c['status']=='PASS' for c in checks) else 'FAIL','checks':checks,'pass_count':sum(c['status']=='PASS' for c in checks),'fail_count':sum(c['status']=='FAIL' for c in checks)}
out=ROOT/'audit/P003_R009_EXACT_VALIDATION.json'; out.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'status':result['status'],'pass':result['pass_count'],'fail':result['fail_count'],'output':str(out)},ensure_ascii=False))
sys.exit(0 if result['status']=='PASS' else 1)
