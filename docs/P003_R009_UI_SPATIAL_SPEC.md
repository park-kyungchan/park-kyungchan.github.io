# P003 R009 UI and Spatial Specification

## Fixed two-panel shell

```text
left panel  = question, prediction, exact controls, play/previous/next, evidence trigger
right stage = shared WebGL/Canvas2D renderer, camera toolbar, live explanation, spatial HUD, section/path inset
```

There is no third panel, resize separator, bottom panel, or floating playback transport. The right-top live guide changes with phase and mathematical state; exact details open only through the evidence dialog.

## Shared spatial renderer

Chapters 4, 7, 8, and 9 use the same `PolyRenderer` camera/projection/interaction path. R009 generates deterministic face meshes and overlay segments for:

- surface-of-revolution generation;
- cutting-plane position and mesh/plane display intersection;
- unfolded surface interpolation and shortest-path overlays.

The student can orbit and zoom while autoplay progresses. Camera input changes only the view; the progress slider/state data changes the mathematical object.

## Revolution profiles

- Basic: 원기둥, 원뿔, 원뿔대, 구.
- Offset from axis: 속 빈 원기둥, 도넛 모양 회전체.
- Composite: 원기둥+원뿔, 원기둥+반구 돔, 원기둥+원뿔대+원뿔, 단이 있는 회전체.

## Integrated section/locus

The one chapter uses 13 validated cases. Each state separates:

1. analytic classification and values;
2. finite-solid boundary components;
3. display mesh and display intersection polyline;
4. a plane-view inset generated from the same current case.

“비스듬히 자르면 항상 타원” is not used. Cap chords, apex cases, annulus, and disconnected components are represented where applicable.

## Integrated distance/unfold

The first decision is the metric domain: interior straight line, surface-only path, or edge-only path. The animation then unfolds/develops the relevant surface and compares valid planar candidates. Cube, cylinder, cone, and sphere-enrichment cases share exact formula and displayed path data.

## Motion and input

- Motion grammar: PREVIEW → ANTICIPATION → TRANSFORM → SETTLE → HOLD.
- Pointer Events: mouse, touch, pen path; pointer capture and cancellation recovery.
- Camera alternatives: toolbar zoom, reset, and keyboard arrow/+/−/R controls.
- Reduced motion: semantic phases and endpoints remain available.
- Hidden state: autoplay stops and does not resume stale timers.

## Approximation disclosure

- Sweep mesh: 84 angular segments.
- Profile segments: 36.
- Recorded sagitta bound for radius 2: `0.001398590423`.
- Exact authority: classification, displayed values, distance domains, and path lengths.
- Display-only: shading, tessellation, and mesh-plane polyline.
