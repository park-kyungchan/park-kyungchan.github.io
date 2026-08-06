import { P003_DATA, P003_R009_EXACT } from './data/p003-data.js';
import { explorer } from './chapters/explorer.js';
import { generator } from './chapters/generator.js';
import { euler } from './chapters/euler.js';
import { net } from './chapters/net.js';
import { section } from './chapters/section.js';
import { revolution } from './chapters/revolution.js';
import { revsection } from './chapters/revsection.js';
import { soccer } from './chapters/soccer.js';
import { geodesic } from './chapters/geodesic.js';
import { dummy } from './chapters/_dummy.js';

export const lab = {
  meta: {
    id: 'solid', title: '입체 탐구랩', grade: '중1 · 2학기',
    units: [
      { id: 'poly', numeral: 'Ⅰ', title: '다면체' },
      { id: 'rev', numeral: 'Ⅱ', title: '회전체' },
      { id: 'adv', numeral: 'Ⅲ', title: '심화 탐구' },
    ],
  },
  data: { D: P003_DATA, E: P003_R009_EXACT },
  chapters: [explorer, generator, euler, net, section, revolution, revsection, soccer, geodesic, dummy],
};
