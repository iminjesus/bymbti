/* bymbti — 질문/과제 분석기
 * 입력된 아무 질문이나 읽고 (1) 과제 유형 (2) 필요한 역량 (3) 답변 축을 뽑는다.
 */

/* 과제 유형: 키워드가 걸리면 해당 역량 가중치가 올라간다 */
const TASK_KINDS = [
  {
    id: 'presentation', label: '발표형 과제', emoji: '🎤',
    words: ['발표', 'ppt', 'PPT', '프레젠테이션', '피피티', '슬라이드', '브리핑', '설명회'],
    boost: { presentation: 1.6, design: 1.5, persuasion: 1.2 },
    output: '슬라이드 10~15장 + 발표 대본',
  },
  {
    id: 'research', label: '조사·리서치형 과제', emoji: '🔎',
    words: ['조사', '리서치', '자료', '사례', '통계', '현황', '실태', '문헌', '설문'],
    boost: { research: 1.6, detail: 1.3, analysis: 1.2 },
    output: '출처가 달린 근거 표 + 요약 리포트',
  },
  {
    id: 'debate', label: '토론·찬반형 과제', emoji: '⚖️',
    words: ['토론', '찬반', '찬성', '반대', '논쟁', '쟁점', '입장', '비판'],
    boost: { persuasion: 1.6, analysis: 1.5, ideation: 1.2 },
    output: '입론 + 예상 반박 + 재반박 카드',
  },
  {
    id: 'report', label: '보고서·레포트형 과제', emoji: '📄',
    words: ['보고서', '레포트', '리포트', '논문', '에세이', '작성', '서술', '기술하시오', '논하시오'],
    boost: { writing: 1.6, analysis: 1.3, detail: 1.2 },
    output: '서론-본론-결론 구조의 문서 + 참고문헌',
  },
  {
    id: 'plan', label: '기획·전략형 과제', emoji: '🗺️',
    words: ['기획', '전략', '계획', '방안', '해결', '대책', '개선', '제안', '설계', '로드맵'],
    boost: { planning: 1.5, ideation: 1.4, leadership: 1.2 },
    output: '문제 정의 → 대안 비교 → 실행 계획 3단 구성',
  },
  {
    id: 'creative', label: '창작·아이디어형 과제', emoji: '✨',
    words: ['아이디어', '창작', '브레인스토밍', '디자인', '캠페인', '광고', '콘텐츠', '작품', '공모'],
    boost: { ideation: 1.6, design: 1.4, presentation: 1.2 },
    output: '콘셉트 1장 + 시안 + 실행 시나리오',
  },
  {
    id: 'build', label: '제작·실습형 과제', emoji: '🛠️',
    words: ['제작', '만들기', '실험', '개발', '구현', '코딩', '프로토타입', '실습', '앱', '시연'],
    boost: { execution: 1.6, analysis: 1.2, detail: 1.2 },
    output: '동작하는 결과물 + 제작 과정 기록',
  },
  {
    id: 'data', label: '데이터·분석형 과제', emoji: '📊',
    words: ['데이터', '분석', '수치', '지표', '그래프', '통계분석', '비교', '검증', '측정'],
    boost: { analysis: 1.6, detail: 1.4, design: 1.2 },
    output: '데이터 표 + 시각화 + 해석 문단',
  },
  {
    id: 'social', label: '사회·캠페인형 과제', emoji: '🌍',
    words: ['캠페인', '봉사', '사회', '환경', '공익', '실천', '참여', '인식개선', '윤리'],
    boost: { harmony: 1.4, persuasion: 1.4, execution: 1.2 },
    output: '메시지 + 실천 행동 목록 + 확산 방법',
  },
];

/* 답변 축: 질문이 실제로 뭘 물어보는지 */
const ANSWER_AXES = [
  { id: 'define', label: '개념 정의', words: ['정의', '무엇', '개념', '뜻', '의미', '이란'], verb: '용어와 범위를 못 박는다' },
  { id: 'cause', label: '원인', words: ['원인', '이유', '배경', '왜'], verb: '원인을 지목한다' },
  { id: 'impact', label: '영향·결과', words: ['영향', '결과', '효과', '파급', '피해', '변화'], verb: '파급 범위를 짚는다' },
  { id: 'problem', label: '문제점', words: ['문제', '한계', '단점', '위험', '리스크', '쟁점'], verb: '걸림돌을 드러낸다' },
  { id: 'solution', label: '해결 방안', words: ['해결', '방안', '대책', '개선', '대안', '방법', '전략'], verb: '해결책을 제시한다' },
  { id: 'case', label: '사례·근거', words: ['사례', '예시', '근거', '통계', '자료', '데이터', '실태'], verb: '실제 근거를 붙인다' },
  { id: 'compare', label: '비교', words: ['비교', '차이', '대비', '장단점', '유사'], verb: '기준을 세워 비교한다' },
  { id: 'future', label: '전망·미래', words: ['전망', '미래', '예측', '앞으로', '향후', '지속가능'], verb: '앞으로의 흐름을 그린다' },
  { id: 'action', label: '실천 방법', words: ['실천', '행동', '적용', '활용', '역할', '참여'], verb: '당장 할 수 있는 행동을 정한다' },
];

const STOPWORDS = ['그리고', '그러나', '대한', '대해', '대하여', '위한', '위해', '있는', '있다', '하는', '한다',
  '하시오', '하라', '무엇', '어떤', '어떻게', '입니까', '인가', '것인가', '주제', '과제', '조별', '그룹', '모둠',
  '조사', '발표', '분석', '서술', '설명', '작성', '제작', '정리', '비교', '평가', '토론', '기획', '제안',
  '탐구', '검토', '준비', '수행', '진행', '논의', '기술', '자료', '우리', '오늘', '이번', '관련', '통해', '다음', '경우', '미치', '만드', '만든', '가지', '다루', '이루', '따르', '나타'];

const VERB_ENDING = /(?:하시오|하라|해라|해줘|합니다|한다|하고|하여|해서|하며|하기|했다|였다|이다|되는|되다)$/;
const PARTICLE_ENDING = /(?:에서의|에게서|으로서|으로써|이라는|라는|에서|에게|으로|까지|부터|보다|처럼|밖에|의|과|와|을|를|은|는|이|가|에|로|도|만)$/;

/* "온난화의" → "온난화", "발표하시오" → "발표"(지시어라 제외) */
function normalizeToken(word) {
  let w = word;
  for (let i = 0; i < 2; i += 1) {
    const next = w.replace(VERB_ENDING, '').replace(PARTICLE_ENDING, '');
    if (next === w || next.length < 2) break;
    w = next;
  }
  return w;
}

function extractKeywords(text, limit = 6) {
  const tokens = text
    .replace(/[^가-힣a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((w) => normalizeToken(w.trim()))
    .filter((w) => w.length >= 2 && !STOPWORDS.includes(w));
  const counts = {};
  tokens.forEach((w) => { counts[w] = (counts[w] || 0) + 1; });
  return Object.entries(counts)
    .sort((a, b) => (b[1] - a[1]) || (b[0].length - a[0].length))
    .slice(0, limit)
    .map(([w]) => w);
}

/* 주제 요약: 뒤에 붙은 지시어("~에 대해 조사하고 발표하시오")를 걷어낸 명사구 */
const DIRECTIVE_TAIL = /\s*(?:에\s*대(?:해서|해|하여|한)|에\s*관(?:해서|해|하여|한))?\s*(?:을|를|은|는)?\s*(?:설문조사|실태조사|현장조사|사례조사|조사|분석|서술|설명|기술|논의|논|발표|작성|제작|정리|비교|평가|토론|기획|제안|탐구|고찰|검토|준비|수행|진행)(?:하고|하여|해서|하며|한\s*뒤|한\s*후|하시오|하라|해라|해줘|해\s*주세요|하기|한다|합니다|할\s*것)?\s*$/;
const DANGLING_TAIL = /\s*(?:에\s*대(?:해서|해|하여|한)|에\s*관(?:해서|해|하여|한))\s*$/;
const PARTICLE_TAIL = /\s*(?:을|를|은|는|이|가)\s*$/;
const OUTPUT_NOUN_TAIL = /\s*(?:보고서|레포트|리포트|논문|에세이|발표문|계획서|제안서|기획안|결과물)(?:을|를|은|는|이|가)?\s*$/;

function shortTopic(text) {
  let t = text.trim().replace(/\s+/g, ' ');
  t = t.replace(/[?？.!]+$/, '');

  for (let guard = 0; guard < 8; guard += 1) {
    let next = t.replace(DIRECTIVE_TAIL, '').replace(DANGLING_TAIL, '');
    if (next !== t) {
      next = next.replace(PARTICLE_TAIL, '');
    } else {
      const stripped = next.replace(OUTPUT_NOUN_TAIL, '');
      if (stripped !== next && stripped.trim()) next = stripped;
    }
    if (next === t || !next.trim()) break;
    t = next;
  }

  t = t.replace(/[\s,·\-—–]+$/, '');
  if (t.length > 46) t = t.slice(0, 46) + '…';
  return t.trim() || text.trim();
}

function analyzeQuestion(text) {
  const q = (text || '').trim();
  const lower = q.toLowerCase();

  /* 0) 이게 과제인지 일상 질문인지 먼저 가른다 */
  const scene = detectScene(q);
  const isAssignment = !scene;
  const roleSet = isAssignment ? ROLES : scene.positions;
  const roleLookup = Object.fromEntries(roleSet.map((r) => [r.id, r]));
  const options = isAssignment ? null : extractOptions(q);

  /* 1) 과제라면 어떤 유형의 과제인지 */
  const kindHits = !isAssignment ? [] : TASK_KINDS.map((k) => {
    const hits = k.words.filter((w) => lower.includes(w.toLowerCase()));
    return { kind: k, score: hits.length, hits };
  }).filter((h) => h.score > 0).sort((a, b) => b.score - a.score);

  const primary = kindHits[0] ? kindHits[0].kind : null;
  const kinds = kindHits.slice(0, 2).map((h) => h.kind);

  /* 2) 역량 가중치 */
  const weights = {};
  Object.keys(TRAIT_LABELS).forEach((k) => { weights[k] = 1; });

  if (isAssignment) {
    kinds.forEach((k, i) => {
      const scale = i === 0 ? 1 : 0.6;
      Object.entries(k.boost).forEach(([trait, v]) => {
        weights[trait] = Math.max(weights[trait], 1 + (v - 1) * scale);
      });
    });
    if (/조별|그룹|팀|모둠|공동/.test(q)) {
      weights.harmony = Math.max(weights.harmony, 1.25);
      weights.leadership = Math.max(weights.leadership, 1.2);
    }
  } else {
    Object.entries(scene.boost).forEach(([trait, v]) => { weights[trait] = v; });
    /* 양자택일이면 결단력이 제일 중요하다 */
    if (options) {
      weights.leadership = Math.max(weights.leadership, 1.35);
      weights.analysis = Math.max(weights.analysis, 1.25);
    }
  }

  /* 3) 답변 축 (과제일 때만 의미 있음) */
  let axes = ANSWER_AXES.filter((a) => a.words.some((w) => lower.includes(w.toLowerCase())));
  if (axes.length === 0) axes = [ANSWER_AXES[0], ANSWER_AXES[5], ANSWER_AXES[4]];
  axes = axes.slice(0, 3);

  /* 4) 역할/포지션 우선순위 */
  const rolePriority = roleSet.map((role) => {
    let sc = 0;
    let w = 0;
    Object.entries(role.need).forEach(([trait, rw]) => {
      sc += rw * (weights[trait] || 1);
      w += rw;
    });
    return { role, priority: w ? sc / w : 1 };
  }).sort((a, b) => b.priority - a.priority);

  const topTraits = Object.entries(weights)
    .filter(([, v]) => v > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([k]) => ({ key: k, label: TRAIT_LABELS[k] }));

  return {
    question: q,
    topic: shortTopic(q),
    keywords: extractKeywords(q),
    scene,
    isAssignment,
    roleSet,
    roleLookup,
    options,
    kinds,
    kindLabel: isAssignment ? (primary ? primary.label : '일반 탐구형 과제') : scene.label,
    kindEmoji: isAssignment ? (primary ? primary.emoji : '🧭') : scene.emoji,
    output: isAssignment
      ? (primary ? primary.output : '핵심 주장 + 근거 + 결론 구성의 결과물')
      : scene.output,
    weights,
    axes,
    rolePriority,
    topTraits,
    isGroup: /조별|그룹|팀|모둠|공동/.test(q),
  };
}

/* 진행 로드맵: 과제 유형에 맞춰 단계별 담당 역할을 붙인다 */
function buildRoadmap(analysis) {
  const base = [
    { step: '① 주제 쪼개기', desc: `"${analysis.topic}"${josa(analysis.topic, '을/를')} 답변 축(${analysis.axes.map((a) => a.label).join(' / ')})${josa(analysis.axes[analysis.axes.length - 1].label, '으로/로')} 나눈다.`, roleIds: ['leader', 'analysis'] },
    { step: '② 자료 모으기', desc: '근거 5개 이상을 출처와 함께 수집한다.', roleIds: ['research', 'devil'] },
    { step: '③ 아이디어 수렴', desc: '발산 30분 → 후보 3개 → 최종 1개로 좁힌다.', roleIds: ['ideation', 'harmony'] },
    { step: '④ 결과물 제작', desc: `${analysis.output} 형태로 만든다.`, roleIds: ['writer', 'design'] },
    { step: '⑤ 리허설 · 방어', desc: '예상 질문 10개를 뽑고 답변을 맞춰본다.', roleIds: ['devil', 'presenter'] },
    { step: '⑥ 제출 · 발표', desc: '최종 점검 후 제출하고 무대에 오른다.', roleIds: ['presenter', 'pm'] },
  ];
  return base.map((s) => ({ ...s, roles: s.roleIds.map((id) => ROLES_BY_ID[id]) }));
}
