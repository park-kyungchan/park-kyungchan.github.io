import { Dock, LabSelect, SegmentedControl, ChipToggle, LabSlider, Transport } from '@tamgu/ui';

/** 오일러 공식 챕터의 실제 독 — 입체 선택 + 세어 보기 + 읽기값 + 트랜스포트 */
export const EulerDock = () => (
  <Dock
    readout="V 4 − E 6 + F 4 = 2"
    onMinimize={() => {}}
    transport={<Transport unitLabel="Ⅰ 다면체" chapterLabel="03 · 오일러 공식" playing progress={62} />}
  >
    <LabSelect
      groups={[
        {
          label: '기본 입체 (각기둥 · 각뿔)',
          opts: [
            { id: 'PRISM_TRI', name: '삼각기둥' },
            { id: 'PRISM_SQ', name: '사각기둥' },
            { id: 'PYR_TRI', name: '삼각뿔' },
            { id: 'PYR_SQ', name: '사각뿔' },
          ],
        },
        {
          label: '정다면체',
          opts: [
            { id: 'PLATONIC_TETRA', name: '정사면체' },
            { id: 'PLATONIC_CUBE', name: '정육면체' },
            { id: 'PLATONIC_OCTA', name: '정팔면체' },
            { id: 'PLATONIC_DODECA', name: '정십이면체' },
            { id: 'PLATONIC_ICOSA', name: '정이십면체' },
          ],
        },
      ]}
      value="PLATONIC_TETRA"
    />
    <SegmentedControl
      label="세어 보기"
      options={[
        { id: 'v', label: '꼭짓점' },
        { id: 'e', label: '모서리' },
        { id: 'f', label: '면' },
      ]}
      value="v"
    />
  </Dock>
);

/** 컨트롤 전용 독 — 모드 전환 + 단면 토글 + 회전각 슬라이더, 트랜스포트 없음 */
export const ControlsOnly = () => (
  <Dock>
    <SegmentedControl
      label="모드"
      options={[
        { id: 'rotate', label: '회전' },
        { id: 'unfold', label: '펼치기' },
        { id: 'section', label: '단면' },
      ]}
      value="rotate"
    />
    <ChipToggle label="단면 표시" active />
    <LabSlider label="회전각" min={0} max={360} value={210} />
  </Dock>
);
