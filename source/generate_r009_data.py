#!/usr/bin/env python3
from __future__ import annotations
import json, math, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[1]

def n(v):
    return [float(x) for x in v]

def unit(v):
    m=math.sqrt(sum(x*x for x in v)); return [x/m for x in v]

def plane(normal,d):
    u=unit(normal); m=math.sqrt(sum(x*x for x in normal)); return {'normal':u,'d':d/m}

profiles={
 'cylinder': {'label':'원기둥','profile_label':'직사각형','category':'core','axis_relation':'touches_axis','components':[{'kind':'polygon','points':[[0,-1.5],[1.5,-1.5],[1.5,1.5],[0,1.5]]}], 'exact':{'radius':1.5,'height':3.0}},
 'cone': {'label':'원뿔','profile_label':'직각삼각형','category':'core','axis_relation':'touches_axis','components':[{'kind':'polygon','points':[[0,-1.5],[1.2,-1.5],[0,1.5]]}], 'exact':{'base_radius':1.2,'height':3.0}},
 'frustum': {'label':'원뿔대','profile_label':'사다리꼴','category':'core','axis_relation':'touches_axis','components':[{'kind':'polygon','points':[[0,-1.5],[1.5,-1.5],[0.72,1.5],[0,1.5]]}], 'exact':{'bottom_radius':1.5,'top_radius':0.72,'height':3.0}},
 'sphere': {'label':'구','profile_label':'반원','category':'core','axis_relation':'touches_axis','components':[{'kind':'semicircle','radius':2.0,'samples':32}], 'exact':{'radius':2.0}},
 'hollow_cylinder': {'label':'속 빈 원기둥','profile_label':'축에서 떨어진 직사각형','category':'core_extension','axis_relation':'offset_from_axis','components':[{'kind':'polygon','points':[[0.55,-1.5],[1.5,-1.5],[1.5,1.5],[0.55,1.5]]}], 'exact':{'inner_radius':0.55,'outer_radius':1.5,'height':3.0}},
 'torus': {'label':'도넛 모양 회전체','profile_label':'축에서 떨어진 원','category':'enrichment','axis_relation':'offset_from_axis','components':[{'kind':'circle','center':[1.55,0.0],'radius':0.45,'samples':36}], 'exact':{'major_radius':1.55,'minor_radius':0.45}},
 'cylinder_cone': {'label':'원기둥 + 원뿔','profile_label':'직사각형 + 삼각형','category':'composite','axis_relation':'touches_axis','components':[{'kind':'polygon','points':[[0,-1.7],[1.2,-1.7],[1.2,0.35],[0,0.35]]},{'kind':'polygon','points':[[0,0.35],[1.2,0.35],[0,1.75]]}], 'exact':{'parts':['cylinder','cone']}},
 'cylinder_dome': {'label':'원기둥 + 반구 돔','profile_label':'직사각형 + 1/4원 곡선','category':'composite','axis_relation':'touches_axis','components':[{'kind':'polygon','points':[[0,-1.8],[1.18,-1.8],[1.18,0.35],[0,0.35]]},{'kind':'dome','radius':1.18,'base_y':0.35,'samples':24}], 'exact':{'parts':['cylinder','hemisphere']}},
 'triple_stack': {'label':'원기둥 + 원뿔대 + 원뿔','profile_label':'세 평면도형 조합','category':'composite','axis_relation':'touches_axis','components':[{'kind':'polygon','points':[[0,-1.85],[1.35,-1.85],[1.35,-0.55],[0,-0.55]]},{'kind':'polygon','points':[[0,-0.55],[1.35,-0.55],[0.8,0.65],[0,0.65]]},{'kind':'polygon','points':[[0,0.65],[0.8,0.65],[0,1.85]]}], 'exact':{'parts':['cylinder','frustum','cone']}},
 'stepped_shaft': {'label':'단이 있는 회전체','profile_label':'크기가 다른 직사각형 조합','category':'composite','axis_relation':'touches_axis','components':[{'kind':'polygon','points':[[0,-1.8],[1.35,-1.8],[1.35,-0.65],[0,-0.65]]},{'kind':'polygon','points':[[0,-0.65],[0.82,-0.65],[0.82,0.65],[0,0.65]]},{'kind':'polygon','points':[[0,0.65],[1.12,0.65],[1.12,1.8],[0,1.8]]}], 'exact':{'parts':['wide_cylinder','narrow_cylinder','medium_cylinder']}},
}

section_cases=[
 {'case_id':'SPHERE-OFF-CENTER','label':'구 · 중심에서 벗어난 평면','profile':'sphere','plane':plane([0,1,0],0.8),'classification':'circle','exact':{'radius':math.sqrt(4-0.8**2)},'boundary_components':['sphere_plane_circle']},
 {'case_id':'SPHERE-TANGENT','label':'구 · 접하는 평면','profile':'sphere','plane':plane([0,1,0],2.0),'classification':'tangent_point','exact':{'radius':0.0},'boundary_components':['single_tangent_point']},
 {'case_id':'CYLINDER-HORIZONTAL','label':'원기둥 · 축에 수직','profile':'cylinder','plane':plane([0,1,0],0.3),'classification':'circle','exact':{'radius':1.5},'boundary_components':['lateral_closed_curve']},
 {'case_id':'CYLINDER-AXIAL','label':'원기둥 · 축과 평행','profile':'cylinder','plane':plane([1,0,0],0.4),'classification':'rectangle','exact':{'width':2*math.sqrt(1.5**2-0.4**2),'height':3.0},'boundary_components':['two_lateral_generators','top_cap_chord','bottom_cap_chord']},
 {'case_id':'CYLINDER-OBLIQUE-CLOSED','label':'원기둥 · 닫힌 비스듬한 절단','profile':'cylinder','plane':plane([-0.25,1,0],0.0),'classification':'ellipse','exact':{'semi_minor':1.5,'semi_major':1.5*math.sqrt(1+0.25**2)},'boundary_components':['lateral_closed_curve']},
 {'case_id':'CYLINDER-OBLIQUE-CAPS','label':'원기둥 · 윗면과 밑면까지 지나는 절단','profile':'cylinder','display_profile_override':{'radius':1.2,'height':2.0},'plane':plane([-1,1,0],0.0),'classification':'curves_and_cap_segments','exact':{'note':'finite caps clip the infinite-cylinder ellipse'},'boundary_components':['lateral_two_arcs','top_cap_chord','bottom_cap_chord']},
 {'case_id':'CONE-HORIZONTAL','label':'원뿔 · 축에 수직','profile':'cone','plane':plane([0,1,0],0.0),'classification':'circle','exact':{'radius':0.6},'boundary_components':['lateral_closed_curve']},
 {'case_id':'CONE-AXIAL','label':'원뿔 · 꼭짓점을 지나는 평면','profile':'cone','plane':plane([1,0,0],0.0),'classification':'triangle','exact':{'base':2.4,'height':3.0},'boundary_components':['two_generators','base_diameter']},
 {'case_id':'CONE-OBLIQUE','label':'원뿔 · 꼭짓점을 지나지 않는 비스듬한 절단','profile':'cone','plane':plane([-0.2,1,0],0.2),'classification':'ellipse','exact':{'passes_apex':False},'boundary_components':['lateral_closed_curve']},
 {'case_id':'FRUSTUM-HORIZONTAL','label':'원뿔대 · 축에 수직','profile':'frustum','plane':plane([0,1,0],0.2),'classification':'circle','exact':{'radius':1.5+(0.72-1.5)*((0.2+1.5)/3.0)},'boundary_components':['lateral_closed_curve']},
 {'case_id':'FRUSTUM-AXIAL','label':'원뿔대 · 축을 포함하는 평면','profile':'frustum','plane':plane([1,0,0],0.0),'classification':'trapezoid','exact':{'bottom_base':3.0,'top_base':1.44,'height':3.0},'boundary_components':['two_generators','top_diameter','bottom_diameter']},
 {'case_id':'HOLLOW-HORIZONTAL','label':'속 빈 원기둥 · 축에 수직','profile':'hollow_cylinder','plane':plane([0,1,0],0.0),'classification':'annulus','exact':{'inner_radius':0.55,'outer_radius':1.5},'boundary_components':['outer_circle','inner_circle']},
 {'case_id':'TORUS-AXIAL','label':'도넛 모양 · 회전축을 포함하는 평면','profile':'torus','plane':plane([0,0,1],0.0),'classification':'two_circles','scope':'ENRICHMENT_NOT_ASSESSMENT','exact':{'circle_radius':0.45,'centers_x':[-1.55,1.55]},'boundary_components':['two_disconnected_circles']},
]

# Shortest path exact data
cube_edge=1.0
cube={'case_id':'CUBE-OPPOSITE-VERTICES','label':'정육면체 · 마주 보는 꼭짓점','edge_length':cube_edge,'interior_distance':math.sqrt(3),'surface_distance':math.sqrt(5),'edge_only_distance':3.0,
      'surface_candidates':[{'id':'two_face_rectangle','length':math.sqrt(5),'valid':True},{'id':'three_face_strip','length':math.sqrt(9),'valid':True}]}
R=1.0; H=2.0; thP=0.0; thQ=3*math.pi/4; zP=-1.0; zQ=1.0
cands=[]
for k in [-1,0,1]:
    dx=R*(thQ-thP+2*math.pi*k); dy=zQ-zP; cands.append({'k':k,'delta_circumference':dx,'delta_height':dy,'length':math.hypot(dx,dy)})
cylinder={'case_id':'CYLINDER-LATERAL','label':'원기둥 옆면','radius':R,'height':H,'P':{'theta':thP,'y':zP},'Q':{'theta':thQ,'y':zQ},'interior_chord':math.hypot(2*R*math.sin((thQ-thP)/2),zQ-zP),'periodic_copies':cands,'surface_minimum':min(c['length'] for c in cands),'minimum_k':min(cands,key=lambda x:x['length'])['k']}
R=1.5; H=2.4; L=math.hypot(R,H); thetaP=0.0; thetaQ=2*math.pi/3; sP=.68*L; sQ=.92*L
cc=[]
for k in [-1,0,1]:
    dphi=(R/L)*(thetaQ-thetaP+2*math.pi*k); length=math.sqrt(sP*sP+sQ*sQ-2*sP*sQ*math.cos(dphi)); cc.append({'k':k,'sector_delta_angle':dphi,'length':length})
cone={'case_id':'CONE-LATERAL','label':'원뿔 옆면','base_radius':R,'height':H,'slant_height':L,'sector_angle':2*math.pi*R/L,'P':{'slant':sP,'theta':thetaP},'Q':{'slant':sQ,'theta':thetaQ},'seam_copies':cc,'surface_minimum':min(c['length'] for c in cc),'minimum_k':min(cc,key=lambda x:x['length'])['k']}
Rs=1.5; central=2*math.pi/3
sphere={'case_id':'SPHERE-ENRICHMENT','label':'구 · 내부와 표면 비교','radius':Rs,'central_angle':central,'interior_chord':2*Rs*math.sin(central/2),'surface_short_arc':Rs*central,'scope':'ENRICHMENT_NOT_ASSESSMENT'}

spec={
 'schema_version':'P003-R009-INTEGRATED-SPATIAL-1.0',
 'axis_convention':'all R009 solids of revolution use the +y object-local axis',
 'revolution_profiles':profiles,
 'revolution_groups':{
   'basic':['cylinder','cone','frustum','sphere'],
   'offset':['hollow_cylinder','torus'],
   'composite':['cylinder_cone','cylinder_dome','triple_stack','stepped_shaft']
 },
 'section_cases':section_cases,
 'shortest_paths':{'cube':cube,'cylinder':cylinder,'cone':cone,'sphere':sphere},
 'chapter_order':['explorer','generator','net','section','euler','soccer','revolution','revsection','geodesic'],
 'model_disclosure':{
   'analytic_authority':'classification, displayed values, path lengths, and metric-domain decisions',
   'display_model':'deterministic triangulated surface-of-revolution mesh rendered by the same PolyRenderer used for the polyhedron cross-section lab',
   'section_curve':'mesh-plane intersection polyline is a display approximation; exact classification is separate',
   'sweep_segments':84,
   'profile_segments':36,
   'max_circle_sagitta_error_radius_2_segments_84':2*(1-math.cos(math.pi/84)),
   'unfold_interpolation':'endpoints are exact developments; intermediate morph is explanatory interpolation except the cube rigid hinge rotation'
 },
}
(ROOT/'data'/'P003_R009_EXACT_SPATIAL_SPEC.json').write_text(json.dumps(spec,ensure_ascii=False,indent=2)+"\n",encoding='utf-8')

states=[]
for tab in spec['chapter_order']:
    if tab in ('revolution','revsection','geodesic'):
        roles=['ENTRY','PREDICT','ANTICIPATION','TRANSFORM','SETTLE','HOLD','VERIFY','EXPLAIN']
    else:
        roles=['ENTRY','MANIPULATE','VERIFY','EXPLAIN']
    states.append({'module':tab,'roles':roles,'camera_orbit_during_autoplay':tab in ('revolution','revsection','geodesic'),'floating_transport':False})
state_graph={'schema_version':'P003-R009-STATE-GRAPH-1.0','chapter_count':9,'chapters':states,'removed':['locus','distance','transfer'],'merged':{'revsection':['revsection','locus'],'geodesic':['distance','geodesic']},'autoplay_and_direct_same_data':True}
(ROOT/'data'/'P003_R009_STATE_GRAPH.json').write_text(json.dumps(state_graph,ensure_ascii=False,indent=2)+"\n",encoding='utf-8')
print(ROOT/'data'/'P003_R009_EXACT_SPATIAL_SPEC.json')
