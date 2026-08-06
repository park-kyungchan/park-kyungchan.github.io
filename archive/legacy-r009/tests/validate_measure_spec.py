#!/usr/bin/env python3
"""Independent validation of the P1-3 measurement spec and family solid records.

Recomputes every number in window.P003_MEASURE from the declared dimensions
without importing the generators, cross-checks the reference-resolved
dimensions against window.P003_R009_EXACT, and re-derives the family solids'
topology and base geometry straight from their stored vertices/faces.

Sources read:
    data/P003_MEASURE_SPEC.json          pretty twin of window.P003_MEASURE
    data/P003_FAMILY_SOLIDS.json         pretty twin of the FAMILY_* records
    src/25_data_measure.js.part          embedded measurement payload
    src/21_data_p003_core.js.part        embedded core payload
    src/20_data_script_open_r009_exact.js.part   revolution profile dimensions

Writes audit/P003_MEASURE_VALIDATION.json. Exit 0 only when every check passes.
"""
from __future__ import annotations
import json, math, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
TOL = 1e-9

spec = json.loads((ROOT / 'data/P003_MEASURE_SPEC.json').read_text(encoding='utf-8'))
family = json.loads((ROOT / 'data/P003_FAMILY_SOLIDS.json').read_text(encoding='utf-8'))

def embedded(path, prefix):
    for line in (ROOT / path).read_text(encoding='utf-8').split('\n'):
        if line.startswith(prefix):
            return json.loads(line[len(prefix):-1])
    raise SystemExit(f'FAIL: {path} does not define {prefix}')

measure_embedded = embedded('src/25_data_measure.js.part', 'window.P003_MEASURE = ')
core_embedded = embedded('src/21_data_p003_core.js.part', 'window.P003_DATA = ')
r009 = embedded('src/20_data_script_open_r009_exact.js.part', 'window.P003_R009_EXACT=')
profiles = r009['revolution_profiles']

checks = []
def check(name, cond, actual=None, expected=None):
    checks.append({'id': name, 'status': 'PASS' if cond else 'FAIL', 'actual': actual, 'expected': expected})

def close(a, b, tol=TOL):
    return isinstance(a, (int, float)) and isinstance(b, (int, float)) and abs(a - b) <= tol * max(1.0, abs(a), abs(b))

def value_check(name, quantity, expected):
    check(name, quantity is not None and close(quantity['value'], expected),
          None if quantity is None else quantity['value'], expected)

PI = math.pi
def polygon_area(n, edge): return n * edge * edge / (4.0 * math.tan(PI / n))
def polygon_apothem(n, edge): return edge / (2.0 * math.tan(PI / n))

surface = {case['id']: case for case in spec['surface_area']['cases']}
volumes = {case['id']: case for case in spec['volume']['cases']}
relations = {item['id']: item for item in spec['volume']['relations']}
records = family['solids']

# --------------------------------------------------------------------------- structure
check('MEASURE-DATA-001-schema-version', spec['schema_version'] == 'P003-MEASURE-001-SURFACE-VOLUME', spec['schema_version'], 'P003-MEASURE-001-SURFACE-VOLUME')
expected_surface = ['SA-PRISM-3', 'SA-PRISM-4', 'SA-CYLINDER', 'SA-PYRAMID-4', 'SA-CONE', 'SA-SPHERE', 'SA-FRUSTUM-PYR-4', 'SA-FRUSTUM-CONE']
expected_volume = ['V-PRISM-3', 'V-PRISM-4', 'V-CYLINDER', 'V-PYRAMID-4', 'V-CONE', 'V-SPHERE', 'V-FRUSTUM-CONE']
check('MEASURE-DATA-002-surface-case-ids', [c['id'] for c in spec['surface_area']['cases']] == expected_surface, [c['id'] for c in spec['surface_area']['cases']], expected_surface)
check('MEASURE-DATA-003-volume-case-ids', [c['id'] for c in spec['volume']['cases']] == expected_volume, [c['id'] for c in spec['volume']['cases']], expected_volume)
check('MEASURE-DATA-004-relation-ids', sorted(relations) == ['REL-CONE-THIRD', 'REL-PYRAMID-THIRD', 'REL-SPHERE-TWO-THIRDS'], sorted(relations))
scopes = {c['scope'] for c in spec['surface_area']['cases']} | {c['scope'] for c in spec['volume']['cases']}
check('MEASURE-DATA-005-scope-vocabulary', scopes <= {'core', 'enrichment'}, sorted(scopes), ['core', 'enrichment'])
check('MEASURE-DATA-006-enrichment-scoped', surface['SA-FRUSTUM-PYR-4']['scope'] == 'enrichment' and surface['SA-FRUSTUM-CONE']['scope'] == 'enrichment' and volumes['V-FRUSTUM-CONE']['scope'] == 'enrichment', None, 'enrichment')
check('MEASURE-DATA-007-family-record-count', len(records) == 8, len(records), 8)
check('MEASURE-DATA-008-family-order', family['family_order'] == list(records), family['family_order'], list(records))
check('MEASURE-DATA-009-expr-and-value-paired', all(
    isinstance(q.get('expr'), str) and isinstance(q.get('value'), float)
    for case in list(surface.values()) + list(volumes.values())
    for q in case.values() if isinstance(q, dict) and 'value' in q), None, 'every quantity has expr + float value')

# --------------------------------------------------------------------------- embedded vs twin
check('MEASURE-EMBED-001-part25-equals-twin', measure_embedded == spec, None, 'JSON-equal')
embedded_family = {k: v for k, v in core_embedded['solids'].items() if k.startswith('FAMILY_')}
check('MEASURE-EMBED-002-part21-equals-twin', embedded_family == records, list(embedded_family), list(records))
check('MEASURE-EMBED-003-family-order', core_embedded['ui'].get('family_order') == family['family_order'], core_embedded['ui'].get('family_order'), family['family_order'])
leaked = [x for key in ('platonic_order', 'extension_order') for x in core_embedded['ui'][key] if x.startswith('FAMILY_')]
check('MEASURE-EMBED-004-ui-orders-untouched', leaked == [], leaked, [])
check('MEASURE-EMBED-005-solid-ids-resolve', all(case['solid'] in records for case in list(surface.values()) + list(volumes.values()) if case['solid'].startswith('FAMILY_')), None, 'all FAMILY_* solid ids exist')

# --------------------------------------------------------------------------- reference resolution
PROFILE_FOR = {'cylinder': 'cylinder', 'cone': 'cone', 'sphere': 'sphere', 'frustum': 'frustum'}
for case in list(surface.values()) + list(volumes.values()):
    dims = case['dims']
    source = dims.get('source')
    if not source:
        continue
    key = source.split('.')[2]
    exact = profiles[PROFILE_FOR[key]]['exact']
    mismatch = {k: (v, exact.get(k)) for k, v in dims.items() if k != 'source' and not close(v, exact.get(k, float('nan')))}
    check(f"MEASURE-REF-{case['id']}", not mismatch and set(dims) - {'source'} <= set(exact), mismatch or {k: v for k, v in dims.items() if k != 'source'}, exact)

# --------------------------------------------------------------------------- surface areas
def check_pieces(case):
    total = sum(piece['count'] * piece['area_each']['value'] for piece in case['piece_breakdown'])
    check(f"MEASURE-{case['id']}-pieces-sum", close(total, case['total_area']['value']), total, case['total_area']['value'])

for case_id in ('SA-PRISM-3', 'SA-PRISM-4'):
    case = surface[case_id]
    n, a, h = case['dims']['n'], case['dims']['base_edge'], case['dims']['height']
    base, lateral = polygon_area(n, a), n * a * h
    value_check(f'MEASURE-{case_id}-base', case['base_area'], base)
    value_check(f'MEASURE-{case_id}-lateral', case['lateral_area'], lateral)
    value_check(f'MEASURE-{case_id}-total', case['total_area'], 2 * base + lateral)
    check_pieces(case)

case = surface['SA-PYRAMID-4']
n, a, h = case['dims']['n'], case['dims']['base_edge'], case['dims']['height']
slant = math.sqrt(h * h + polygon_apothem(n, a) ** 2)
value_check('MEASURE-SA-PYRAMID-4-slant', case['slant_height'], slant)
value_check('MEASURE-SA-PYRAMID-4-base', case['base_area'], polygon_area(n, a))
value_check('MEASURE-SA-PYRAMID-4-lateral', case['lateral_area'], n * 0.5 * a * slant)
value_check('MEASURE-SA-PYRAMID-4-total', case['total_area'], polygon_area(n, a) + n * 0.5 * a * slant)
check_pieces(case)

case = surface['SA-FRUSTUM-PYR-4']
n, a, b, h = case['dims']['n'], case['dims']['base_edge'], case['dims']['top_edge'], case['dims']['height']
slant = math.sqrt(h * h + (polygon_apothem(n, a) - polygon_apothem(n, b)) ** 2)
value_check('MEASURE-SA-FRUSTUM-PYR-4-slant', case['slant_height'], slant)
value_check('MEASURE-SA-FRUSTUM-PYR-4-base', case['base_area'], polygon_area(n, a))
value_check('MEASURE-SA-FRUSTUM-PYR-4-top', case['top_area'], polygon_area(n, b))
value_check('MEASURE-SA-FRUSTUM-PYR-4-lateral', case['lateral_area'], n * 0.5 * (a + b) * slant)
value_check('MEASURE-SA-FRUSTUM-PYR-4-total', case['total_area'], polygon_area(n, a) + polygon_area(n, b) + n * 0.5 * (a + b) * slant)
check_pieces(case)

case = surface['SA-CYLINDER']
r, h = case['dims']['radius'], case['dims']['height']
value_check('MEASURE-SA-CYLINDER-base', case['base_area'], PI * r * r)
value_check('MEASURE-SA-CYLINDER-lateral', case['lateral_area'], 2 * PI * r * h)
value_check('MEASURE-SA-CYLINDER-total', case['total_area'], 2 * PI * r * r + 2 * PI * r * h)
value_check('MEASURE-SA-CYLINDER-development-width', case['lateral_development']['width'], 2 * PI * r)
check('MEASURE-SA-CYLINDER-development-area', close(case['lateral_development']['width']['value'] * case['lateral_development']['height']['value'], case['lateral_area']['value']), None, 'width x height == lateral')
check_pieces(case)

case = surface['SA-CONE']
r, h = case['dims']['base_radius'], case['dims']['height']
slant = math.sqrt(r * r + h * h)
angle = 2 * PI * r / slant
value_check('MEASURE-SA-CONE-slant', case['slant_height'], slant)
value_check('MEASURE-SA-CONE-base', case['base_area'], PI * r * r)
value_check('MEASURE-SA-CONE-lateral', case['lateral_area'], PI * r * slant)
value_check('MEASURE-SA-CONE-total', case['total_area'], PI * r * r + PI * r * slant)
value_check('MEASURE-SA-CONE-sector-radius', case['lateral_development']['sector_radius'], slant)
value_check('MEASURE-SA-CONE-sector-arc', case['lateral_development']['sector_arc_length'], 2 * PI * r)
value_check('MEASURE-SA-CONE-sector-angle-rad', case['lateral_development']['sector_angle_rad'], angle)
value_check('MEASURE-SA-CONE-sector-angle-deg', case['lateral_development']['sector_angle_deg'], math.degrees(angle))
check('MEASURE-SA-CONE-sector-area-identity', close(0.5 * slant * slant * angle, case['lateral_area']['value']), 0.5 * slant * slant * angle, case['lateral_area']['value'])
check_pieces(case)

case = surface['SA-SPHERE']
r = case['dims']['radius']
value_check('MEASURE-SA-SPHERE-total', case['total_area'], 4 * PI * r * r)
check('MEASURE-SA-SPHERE-no-base', case['base_area'] is None and case['base_count'] == 0, case['base_count'], 0)
check_pieces(case)

case = surface['SA-FRUSTUM-CONE']
R, r, h = case['dims']['bottom_radius'], case['dims']['top_radius'], case['dims']['height']
slant = math.sqrt((R - r) ** 2 + h * h)
value_check('MEASURE-SA-FRUSTUM-CONE-slant', case['slant_height'], slant)
value_check('MEASURE-SA-FRUSTUM-CONE-base', case['base_area'], PI * R * R)
value_check('MEASURE-SA-FRUSTUM-CONE-top', case['top_area'], PI * r * r)
value_check('MEASURE-SA-FRUSTUM-CONE-lateral', case['lateral_area'], PI * (R + r) * slant)
value_check('MEASURE-SA-FRUSTUM-CONE-total', case['total_area'], PI * (R * R + r * r) + PI * (R + r) * slant)
check_pieces(case)

# --------------------------------------------------------------------------- volumes
for case_id in ('V-PRISM-3', 'V-PRISM-4'):
    case = volumes[case_id]
    n, a, h = case['dims']['n'], case['dims']['base_edge'], case['dims']['height']
    value_check(f'MEASURE-{case_id}-base', case['base_area'], polygon_area(n, a))
    value_check(f'MEASURE-{case_id}-volume', case['volume'], polygon_area(n, a) * h)

case = volumes['V-PYRAMID-4']
n, a, h = case['dims']['n'], case['dims']['base_edge'], case['dims']['height']
value_check('MEASURE-V-PYRAMID-4-volume', case['volume'], polygon_area(n, a) * h / 3.0)

case = volumes['V-CYLINDER']
r, h = case['dims']['radius'], case['dims']['height']
value_check('MEASURE-V-CYLINDER-volume', case['volume'], PI * r * r * h)

case = volumes['V-CONE']
r, h = case['dims']['base_radius'], case['dims']['height']
value_check('MEASURE-V-CONE-volume', case['volume'], PI * r * r * h / 3.0)

case = volumes['V-SPHERE']
r = case['dims']['radius']
value_check('MEASURE-V-SPHERE-volume', case['volume'], 4 * PI * r ** 3 / 3.0)

case = volumes['V-FRUSTUM-CONE']
R, r, h = case['dims']['bottom_radius'], case['dims']['top_radius'], case['dims']['height']
big_h = h * R / (R - r)
small_h = h * r / (R - r)
big = PI * R * R * big_h / 3.0
small = PI * r * r * small_h / 3.0
value_check('MEASURE-V-FRUSTUM-CONE-big-cone', case['cut_cone']['big_cone_volume'], big)
value_check('MEASURE-V-FRUSTUM-CONE-small-cone', case['cut_cone']['small_cone_volume'], small)
value_check('MEASURE-V-FRUSTUM-CONE-difference', case['volume'], big - small)
check('MEASURE-V-FRUSTUM-CONE-closed-form', close(case['volume']['value'], PI * h * (R * R + R * r + r * r) / 3.0), case['volume']['value'], PI * h * (R * R + R * r + r * r) / 3.0)
check('MEASURE-V-FRUSTUM-CONE-similar-heights', close(big_h - small_h, h), big_h - small_h, h)

# --------------------------------------------------------------------------- relations
rel = relations['REL-PYRAMID-THIRD']
ratio = volumes['V-PYRAMID-4']['volume']['value'] / volumes['V-PRISM-4']['volume']['value']
check('MEASURE-REL-PYRAMID-THIRD-ratio', close(ratio, 1 / 3) and close(rel['ratio']['value'], 1 / 3), ratio, 1 / 3)
check('MEASURE-REL-PYRAMID-THIRD-same-dims', volumes['V-PYRAMID-4']['dims'] == volumes['V-PRISM-4']['dims'], volumes['V-PYRAMID-4']['dims'], volumes['V-PRISM-4']['dims'])

rel = relations['REL-CONE-THIRD']
matched = rel['matched_reference']
cone_dims = volumes['V-CONE']['dims']
check('MEASURE-REL-CONE-THIRD-matched-dims', close(matched['radius'], cone_dims['base_radius']) and close(matched['height'], cone_dims['height']), (matched['radius'], matched['height']), (cone_dims['base_radius'], cone_dims['height']))
value_check('MEASURE-REL-CONE-THIRD-matched-volume', matched['volume'], PI * matched['radius'] ** 2 * matched['height'])
ratio = volumes['V-CONE']['volume']['value'] / matched['volume']['value']
check('MEASURE-REL-CONE-THIRD-ratio', close(ratio, 1 / 3) and close(rel['ratio']['value'], 1 / 3), ratio, 1 / 3)
check('MEASURE-REL-CONE-THIRD-not-r009-cylinder', not close(volumes['V-CYLINDER']['dims']['radius'], cone_dims['base_radius']) and 'V-CYLINDER' not in rel['pair'], rel['pair'], 'must not claim the R009 cylinder matches the cone')

rel = relations['REL-SPHERE-TWO-THIRDS']
matched = rel['matched_reference']
sphere_r = volumes['V-SPHERE']['dims']['radius']
check('MEASURE-REL-SPHERE-circumscribed-dims', close(matched['radius'], sphere_r) and close(matched['height'], 2 * sphere_r), (matched['radius'], matched['height']), (sphere_r, 2 * sphere_r))
value_check('MEASURE-REL-SPHERE-circumscribed-volume', matched['volume'], PI * sphere_r ** 2 * 2 * sphere_r)
ratio = volumes['V-SPHERE']['volume']['value'] / matched['volume']['value']
check('MEASURE-REL-SPHERE-ratio', close(ratio, 2 / 3) and close(rel['ratio']['value'], 2 / 3), ratio, 2 / 3)

# --------------------------------------------------------------------------- family records: topology and geometry
def pattern_value(text, n):
    text = text.strip()
    coefficient, _, remainder = text.partition('n')
    if not _:
        return int(text)
    coefficient = int(coefficient) if coefficient else 1
    return coefficient * n + (int(remainder) if remainder else 0)

FORMULAS = {'prism': (2, 3, 1), 'pyramid': (1, 2, 1), 'frustum_pyramid': (2, 3, 1)}
CLOSED_FORM = {
    'prism': lambda n: (2 * n, 3 * n, n + 2),
    'pyramid': lambda n: (n + 1, 2 * n, n + 1),
    'frustum_pyramid': lambda n: (2 * n, 3 * n, n + 2),
}

def face_area(vertices, face):
    nx = ny = nz = 0.0
    count = len(face)
    for i in range(count):
        a, b = vertices[face[i]], vertices[face[(i + 1) % count]]
        nx += (a[1] - b[1]) * (a[2] + b[2])
        ny += (a[2] - b[2]) * (a[0] + b[0])
        nz += (a[0] - b[0]) * (a[1] + b[1])
    return 0.5 * math.sqrt(nx * nx + ny * ny + nz * nz)

def edge_lengths(vertices, face):
    count = len(face)
    return [math.dist(vertices[face[i]], vertices[face[(i + 1) % count]]) for i in range(count)]

for solid_id, record in records.items():
    fam = record['family']
    params = record['family_params']
    n = params['n']
    vertices, faces, topology = record['vertices'], record['faces'], record['topology']
    mesh_edges = {tuple(sorted((face[i], face[(i + 1) % len(face)]))) for face in faces for i in range(len(face))}
    counts = (len(vertices), len(mesh_edges), len(faces))
    check(f'MEASURE-TOPO-{solid_id}-mesh-counts', counts == (topology['V'], topology['E'], topology['F']), counts, (topology['V'], topology['E'], topology['F']))
    check(f'MEASURE-TOPO-{solid_id}-formula', counts == CLOSED_FORM[fam](n), counts, CLOSED_FORM[fam](n))
    check(f'MEASURE-TOPO-{solid_id}-euler', topology['V'] - topology['E'] + topology['F'] == 2, topology['V'] - topology['E'] + topology['F'], 2)
    check(f'MEASURE-TOPO-{solid_id}-manifold', all(len(x) == 2 for x in topology['edge_incident_faces']), None, 'every edge borders exactly 2 faces')
    pattern = spec['explorer_patterns'][fam]
    derived = (pattern_value(pattern['V'], n), pattern_value(pattern['E'], n), pattern_value(pattern['F'], n))
    check(f'MEASURE-PATTERN-{solid_id}', derived == counts, derived, counts)

    partition = sorted(record['base_face_ids'] + record['lateral_face_ids'])
    check(f'MEASURE-FACES-{solid_id}-partition', partition == list(range(len(faces))) and not set(record['base_face_ids']) & set(record['lateral_face_ids']), partition, list(range(len(faces))))
    expected_bases = 1 if fam == 'pyramid' else 2
    check(f'MEASURE-FACES-{solid_id}-base-count', len(record['base_face_ids']) == expected_bases and len(record['lateral_face_ids']) == n, (len(record['base_face_ids']), len(record['lateral_face_ids'])), (expected_bases, n))

    base_face = faces[record['base_face_ids'][0]]
    lengths = edge_lengths(vertices, base_face)
    check(f'MEASURE-GEOM-{solid_id}-base-edge', all(close(x, params['base_edge']) for x in lengths) and len(base_face) == n, (min(lengths), max(lengths)), params['base_edge'])
    check(f'MEASURE-GEOM-{solid_id}-base-area', close(face_area(vertices, base_face), polygon_area(n, params['base_edge'])), face_area(vertices, base_face), polygon_area(n, params['base_edge']))
    extent = max(v[1] for v in vertices) - min(v[1] for v in vertices)
    check(f'MEASURE-GEOM-{solid_id}-height', close(extent, params['height']), extent, params['height'])
    if fam == 'frustum_pyramid':
        top_face = faces[record['base_face_ids'][1]]
        top_lengths = edge_lengths(vertices, top_face)
        check(f'MEASURE-GEOM-{solid_id}-top-edge', all(close(x, params['top_edge']) for x in top_lengths), (min(top_lengths), max(top_lengths)), params['top_edge'])
    if fam == 'pyramid':
        apex = vertices[-1]
        check(f'MEASURE-GEOM-{solid_id}-apex-over-centroid', abs(apex[0]) < 1e-9 and abs(apex[2]) < 1e-9 and close(apex[1], params['height'] / 2), apex, [0, params['height'] / 2, 0])

# --------------------------------------------------------------------------- family solids referenced by the spec
for case in list(surface.values()) + list(volumes.values()):
    if not case['solid'].startswith('FAMILY_'):
        continue
    stored = records[case['solid']]['family_params']
    declared = {k: v for k, v in case['dims'].items() if k in stored}
    check(f"MEASURE-DIMS-{case['id']}", all(close(v, stored[k]) for k, v in declared.items()) and set(declared) == set(stored), declared, stored)

result = {
    'suite': 'P003-MEASURE-SPEC-VALIDATION',
    'status': 'PASS' if all(c['status'] == 'PASS' for c in checks) else 'FAIL',
    'checks': checks,
    'pass_count': sum(c['status'] == 'PASS' for c in checks),
    'fail_count': sum(c['status'] == 'FAIL' for c in checks),
}
out = ROOT / 'audit/P003_MEASURE_VALIDATION.json'
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({'status': result['status'], 'pass': result['pass_count'], 'fail': result['fail_count'], 'output': str(out)}, ensure_ascii=False))
if result['fail_count']:
    for item in checks:
        if item['status'] == 'FAIL':
            print(f"  FAIL {item['id']}: actual={item['actual']!r} expected={item['expected']!r}", file=sys.stderr)
sys.exit(0 if result['status'] == 'PASS' else 1)
