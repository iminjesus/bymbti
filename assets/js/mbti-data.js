/* bymbti — MBTI 원자료
 * 16유형의 인지기능 스택 / 지표 / 강점 / 주의점 / 밈 대사까지 한 곳에.
 * 여기 있는 값만으로 역할 배정 점수가 전부 계산된다. (하드코딩된 정답표 없음)
 */

/* 한국어 조사 자동 선택: 받침 유무로 을/를, 은/는, 으로/로 를 고른다 */
function hasBatchim(word) {
  const cleaned = String(word).replace(/["'\u201d\u2019)\]\u300f\u300d\u2026\s.]+$/, '');
  const ch = cleaned.slice(-1);
  if (!ch) return false;
  const c = ch.charCodeAt(0);
  if (c >= 0xac00 && c <= 0xd7a3) return (c - 0xac00) % 28 !== 0;
  if (/[0-9]/.test(ch)) return ['0', '1', '3', '6', '7', '8'].includes(ch);
  if (/[a-zA-Z]/.test(ch)) return /[lmnrLMNR]/.test(ch);
  return false;
}
function josa(word, pair) {
  const [withB, withoutB] = pair.split('/');
  return hasBatchim(word) ? withB : withoutB;
}

/* ── 8가지 인지기능 ───────────────────────────────────────────── */
const FUNCTIONS = {
  Ni: { name: '내향 직관', short: 'Ni', lens: '근본 구조와 장기 흐름', vibe: '혼자 조용히 미래 시뮬레이션 돌리는 중' },
  Ne: { name: '외향 직관', short: 'Ne', lens: '아직 아무도 안 꺼낸 가능성', vibe: '아이디어가 팝콘처럼 터짐' },
  Si: { name: '내향 감각', short: 'Si', lens: '검증된 사실과 지난 선례', vibe: '작년 자료 폴더까지 정확히 기억함' },
  Se: { name: '외향 감각', short: 'Se', lens: '지금 눈앞의 현실과 즉시 가능한 행동', vibe: '고민할 시간에 이미 하고 있음' },
  Ti: { name: '내향 사고', short: 'Ti', lens: '정확한 정의와 인과 논리', vibe: '"근데 그거 정의가 뭐야?"' },
  Te: { name: '외향 사고', short: 'Te', lens: '수치 목표와 실행 순서', vibe: '간트차트를 사랑함' },
  Fi: { name: '내향 감정', short: 'Fi', lens: '무엇이 옳은가, 누가 피해를 보는가', vibe: '겉은 조용, 속은 신념 활활' },
  Fe: { name: '외향 감정', short: 'Fe', lens: '사람들의 수용성과 팀 합의', vibe: '단톡방 분위기 실시간 모니터링' },
};

/* 인지기능 → 역량 기여도 (0~1). 역할 배정 점수의 뿌리. */
const FUNCTION_TRAITS = {
  Te: { leadership: .90, planning: .90, execution: .85, analysis: .60, persuasion: .60, writing: .50, detail: .45 },
  Ti: { analysis: 1.00, detail: .70, research: .60, writing: .50, ideation: .35 },
  Fe: { harmony: 1.00, presentation: .80, persuasion: .80, leadership: .50, execution: .35 },
  Fi: { harmony: .60, writing: .55, design: .60, ideation: .40, analysis: .25 },
  Se: { execution: 1.00, presentation: .70, design: .60, persuasion: .45, detail: .30 },
  Si: { detail: 1.00, research: .80, planning: .70, writing: .70, analysis: .35 },
  Ne: { ideation: 1.00, research: .70, persuasion: .55, design: .50, presentation: .40 },
  Ni: { analysis: .80, planning: .70, ideation: .70, leadership: .50, writing: .45 },
};

/* 스택 위치별 가중치: 주기능이 제일 세다 */
const STACK_WEIGHT = [1.0, 0.75, 0.40, 0.15];

/* 지표(E/I·S/N·T/F·J/P) 보정 */
const AXIS_TRAITS = {
  E: { presentation: .25, leadership: .15, persuasion: .20, execution: .10 },
  I: { research: .20, writing: .15, analysis: .10, detail: .10 },
  N: { ideation: .15, analysis: .05 },
  S: { detail: .15, execution: .10, research: .05 },
  T: { analysis: .10, planning: .05 },
  F: { harmony: .15, presentation: .05 },
  J: { planning: .20, leadership: .10, detail: .05 },
  P: { ideation: .12, execution: .08, design: .05 },
};

const TRAIT_LABELS = {
  leadership: '통솔력', planning: '기획·일정', research: '자료조사', analysis: '논리·분석',
  ideation: '아이디어', detail: '꼼꼼함', harmony: '팀 조율', execution: '실행력',
  presentation: '전달력', design: '시각화', writing: '문서화', persuasion: '설득력',
};

const GROUPS = {
  NT: { key: 'NT', label: '분석형', emoji: '🧠', color: 'nt', tagline: '"근데 그거 근거 있어?"' },
  NF: { key: 'NF', label: '외교형', emoji: '💚', color: 'nf', tagline: '"우리 다 같이 잘 됐으면 좋겠어"' },
  SJ: { key: 'SJ', label: '관리자형', emoji: '📋', color: 'sj', tagline: '"그래서 마감이 언제라고?"' },
  SP: { key: 'SP', label: '탐험가형', emoji: '🔥', color: 'sp', tagline: '"일단 해보고 생각하자"' },
};

/* ── 16유형 ──────────────────────────────────────────────────── */
const TYPES = [
  {
    code: 'ISTJ', nickname: '청렴결백한 논리주의자', emoji: '📐', group: 'SJ',
    stack: ['Si', 'Te', 'Fi', 'Ne'],
    keywords: ['사실확인', '기록', '책임감', '일관성', '원칙'],
    strengths: ['한 번 맡은 건 마감 전에 끝내 놓는다', '출처 없는 주장을 그냥 넘기지 않는다', '자료 정리 상태가 남들과 차원이 다르다'],
    caution: '"원래 이렇게 하는 건데" 하다가 새로운 방식을 너무 빨리 잘라낼 수 있음',
    meme: '"그거 출처가 어디야?"',
    memeTags: ['#인간_구글스칼라', '#근거없으면_안믿음', '#조별과제_최후의_보루'],
    villain: '남이 대충 만든 자료 보고 조용히 처음부터 다시 만듦',
    teamLine: '이 사람 없으면 그 조 자료는 전부 "누가 그러던데"로 시작한다.',
  },
  {
    code: 'ISFJ', nickname: '용감한 수호자', emoji: '🧸', group: 'SJ',
    stack: ['Si', 'Fe', 'Ti', 'Ne'],
    keywords: ['배려', '꼼꼼함', '지원', '기억력', '성실'],
    strengths: ['남들이 놓친 잔업을 조용히 다 처리해 둔다', '조원 각각의 사정을 다 기억하고 배려한다', '반복 작업의 정확도가 무섭게 높다'],
    caution: '혼자 다 떠안고 아무 말 안 하다가 조용히 번아웃 옴',
    meme: '"다들 밥은 먹었어…?"',
    memeTags: ['#소리없는_에이스', '#거절을_못함', '#단톡방_읽씹_안함'],
    villain: '자기 일 아닌데 다 해놓고 정작 발표 때 이름은 맨 뒤에 적음',
    teamLine: '조별과제 점수의 숨은 지분 40%는 대체로 이 사람 몫이다.',
  },
  {
    code: 'INFJ', nickname: '선의의 옹호자', emoji: '🔮', group: 'NF',
    stack: ['Ni', 'Fe', 'Ti', 'Se'],
    keywords: ['통찰', '의미', '공감', '장기관점', '상징'],
    strengths: ['주제의 "진짜 하고 싶은 말"을 한 문장으로 뽑아낸다', '조원들 사이 미묘한 갈등을 먼저 감지한다', '결론에 메시지를 심어 발표를 기억에 남게 만든다'],
    caution: '머릿속에서 이미 완성했는데 입 밖으로 안 꺼내서 아무도 모름',
    meme: '"나 사실 처음부터 알고 있었어"',
    memeTags: ['#손절의_신', '#말안해도_다_읽음', '#혼자_결론_다냄'],
    villain: '아무 말 안 하다가 마지막에 판을 통째로 뒤집는 한마디를 함',
    teamLine: '조용하다고 방심하면 발표 전날 기획안이 통째로 바뀐다.',
  },
  {
    code: 'INTJ', nickname: '용의주도한 전략가', emoji: '♟️', group: 'NT',
    stack: ['Ni', 'Te', 'Fi', 'Se'],
    keywords: ['전략', '역산', '체계', '독립', '효율'],
    strengths: ['최종 결과물부터 정하고 일정을 거꾸로 짠다', '쓸데없는 작업을 초반에 다 쳐낸다', '논리 구조가 튼튼해서 질문 공격에 안 무너진다'],
    caution: '"이건 설명해도 모를 텐데" 하고 혼자 진행해서 조원들이 미아 됨',
    meme: '"그거 비효율적인데요"',
    memeTags: ['#머릿속_시뮬레이션_100판', '#계획표_이미_완성', '#인간_전략시뮬'],
    villain: '조원 제안 듣고 3초 만에 "그건 안 될 것 같은데" 함',
    teamLine: '방향이 맞으면 조를 우승시키고, 틀리면 아무도 못 말린다.',
  },
  {
    code: 'ISTP', nickname: '만능 재주꾼', emoji: '🔧', group: 'SP',
    stack: ['Ti', 'Se', 'Ni', 'Fe'],
    keywords: ['원리분석', '즉흥대응', '실용', '손기술', '간결'],
    strengths: ['말로 설명할 시간에 일단 만들어서 보여준다', '고장 난 것/막힌 것을 원리부터 뜯어 고친다', '군더더기 없이 딱 필요한 것만 한다'],
    caution: '흥미 떨어지면 관심이 진짜로 0이 됨',
    meme: '"일단 뜯어보자"',
    memeTags: ['#과묵한_해결사', '#말보다_손이_빠름', '#감정소모_사절'],
    villain: '단톡방 300개 메시지 안 읽고 결과물만 툭 올림 (근데 완성도 높음)',
    teamLine: '설명은 못 들어도 결과물은 나온다. 그것도 꽤 잘.',
  },
  {
    code: 'ISFP', nickname: '호기심 많은 예술가', emoji: '🎨', group: 'SP',
    stack: ['Fi', 'Se', 'Ni', 'Te'],
    keywords: ['감각', '미적감각', '가치', '유연', '조용한 실행'],
    strengths: ['결과물의 때깔을 혼자 두 단계 올려놓는다', '분위기를 안 깨면서 자기 몫을 해낸다', '색/배치/톤 같은 감각적 판단이 정확하다'],
    caution: '의견이 있는데 "괜히 분위기 깰까 봐" 삼킴',
    meme: '"음… 좋을 대로 해"  (속마음: 아닌데)',
    memeTags: ['#겉바속촉', '#싫은데_싫다고_못함', '#PPT_장인'],
    villain: '다 동의해 놓고 결과물은 자기 스타일대로 만들어 옴 (근데 그게 더 나음)',
    teamLine: '이 사람이 만진 슬라이드만 유독 예쁘다.',
  },
  {
    code: 'INFP', nickname: '열정적인 중재자', emoji: '🌱', group: 'NF',
    stack: ['Fi', 'Ne', 'Si', 'Te'],
    keywords: ['가치', '상상력', '글쓰기', '공감', '진정성'],
    strengths: ['남들이 못 쓰는 문장으로 결론을 살려낸다', '주제에 "왜 이게 중요한가"를 붙여준다', '소수 의견을 끝까지 대변한다'],
    caution: '머릿속 초안은 완벽한데 문서로 나오는 데 오래 걸림',
    meme: '"머릿속 시나리오 3시간째 진행 중"',
    memeTags: ['#상상속의_나는_이미_발표왕', '#감성_담당', '#마감_전날_각성'],
    villain: '자료 조사하다가 관련 없는 다큐 3편 정주행함',
    teamLine: '보고서 마지막 문단이 좋았다면 십중팔구 이 사람이 썼다.',
  },
  {
    code: 'INTP', nickname: '논리적인 사색가', emoji: '🧪', group: 'NT',
    stack: ['Ti', 'Ne', 'Si', 'Fe'],
    keywords: ['개념정의', '반례', '호기심', '모델링', '검증'],
    strengths: ['용어 정의를 잡아줘서 조 전체의 삽질을 막는다', '반례를 미리 찾아 발표 때 안 털리게 한다', '남들이 안 보는 구조적 허점을 발견한다'],
    caution: '완벽한 정의를 찾다가 정작 결과물 제출이 늦어짐',
    meme: '"근데 그거 정의가 뭐야?"',
    memeTags: ['#논리회로_과열', '#반례_수집가', '#탭_47개_열려있음'],
    villain: '발표 하루 전에 "우리 전제부터 틀린 것 같은데" 함',
    teamLine: '교수님 질문 공격을 미리 다 맞아본 사람이 조에 하나는 있어야 한다.',
  },
  {
    code: 'ESTP', nickname: '모험을 즐기는 사업가', emoji: '🏍️', group: 'SP',
    stack: ['Se', 'Ti', 'Fe', 'Ni'],
    keywords: ['추진력', '현장감각', '협상', '순발력', '실전'],
    strengths: ['막힌 일을 전화 한 통으로 뚫는다', '현장 조사·인터뷰·섭외를 겁 없이 해낸다', '돌발 질문에 즉석에서 잘 받아친다'],
    caution: '준비 없이 들어가서 디테일에서 삐끗함',
    meme: '"고민할 시간에 이미 다녀옴"',
    memeTags: ['#일단_고', '#멘탈_티타늄', '#현장_뚫는_사람'],
    villain: '계획 회의 중에 이미 혼자 실행해버려서 계획이 무의미해짐',
    teamLine: '"그거 누가 연락해?" 할 때 손 드는 사람.',
  },
  {
    code: 'ESFP', nickname: '자유로운 영혼의 연예인', emoji: '🎤', group: 'SP',
    stack: ['Se', 'Fi', 'Te', 'Ni'],
    keywords: ['무대', '분위기', '즉흥', '표현력', '몰입'],
    strengths: ['발표장 공기를 혼자 바꿔놓는다', '지루한 내용을 재밌게 포장한다', '조 분위기가 처질 때 살려낸다'],
    caution: '준비 과정이 지루하면 후반에 몰아치기 발동',
    meme: '"일단 재밌으면 됐지"',
    memeTags: ['#인간_비타민', '#무대체질', '#분위기_담당'],
    villain: '연습 안 했는데 발표는 제일 잘함 (억울함 유발)',
    teamLine: '같은 내용도 이 사람이 읽으면 점수가 오른다.',
  },
  {
    code: 'ENFP', nickname: '재기발랄한 활동가', emoji: '🎈', group: 'NF',
    stack: ['Ne', 'Fi', 'Te', 'Si'],
    keywords: ['아이디어', '연결', '에너지', '스토리', '사람'],
    strengths: ['30분 만에 아이디어를 산더미로 뽑는다', '전혀 다른 분야를 주제에 엮어 신선하게 만든다', '조원 전원의 참여를 끌어낸다'],
    caution: '아이디어 300개 중 실행되는 게 0개일 위험',
    meme: '"아이디어 300개 있는데 실행은 0개야"',
    memeTags: ['#텐션_만렙', '#시작은_창대', '#인싸력_MAX'],
    villain: '회의 때 신나서 주제를 세 번 바꿈',
    teamLine: '기획 회의 첫 30분의 주인공. 그다음은 J한테 넘기자.',
  },
  {
    code: 'ENTP', nickname: '뜨거운 논쟁을 즐기는 변론가', emoji: '⚡', group: 'NT',
    stack: ['Ne', 'Ti', 'Fe', 'Si'],
    keywords: ['발상전환', '토론', '반문', '기획', '재치'],
    strengths: ['"반대로 생각하면?"으로 판을 새로 짠다', '토론·Q&A에서 상대 논리를 즉석에서 해체한다', '뻔한 결론을 뻔하지 않게 만든다'],
    caution: '논쟁이 재밌어서 결론을 안 내고 계속 늘림',
    meme: '"근데 반대로 생각하면 어떨까?"',
    memeTags: ['#악마의_변호인', '#토론_배틀_환영', '#판_뒤집기_장인'],
    villain: '다 정해진 결론에 "근데 말이야" 하고 새 떡밥 던짐',
    teamLine: '질의응답 방어율이 이 사람 유무로 갈린다.',
  },
  {
    code: 'ESTJ', nickname: '엄격한 관리자', emoji: '📊', group: 'SJ',
    stack: ['Te', 'Si', 'Ne', 'Fi'],
    keywords: ['조직화', '마감', '표준', '결단', '실행관리'],
    strengths: ['일정과 담당자를 표로 딱 정리해서 굴린다', '늘어지는 회의를 10분 만에 끝낸다', '해야 할 일을 절대 잊지 않게 만든다'],
    caution: '속도를 밀어붙이다 조원 감정을 지나칠 수 있음',
    meme: '"그래서 마감이 언제라고?"',
    memeTags: ['#엑셀_장인', '#인간_알람', '#무임승차_박멸'],
    villain: '단톡방에 매일 진행률 표 올림 (고맙지만 무섭다)',
    teamLine: '이 사람이 총대 메면 그 조는 일단 제출은 한다.',
  },
  {
    code: 'ESFJ', nickname: '사교적인 외교관', emoji: '☕', group: 'SJ',
    stack: ['Fe', 'Si', 'Ne', 'Ti'],
    keywords: ['조율', '챙김', '협력', '실무', '분위기'],
    strengths: ['조원 스케줄을 맞춰 실제로 모이게 만든다', '갈등을 조용히 중재한다', '빠진 부분을 챙겨 결과물을 완성 상태로 만든다'],
    caution: '모두를 만족시키려다 정작 결론이 흐려짐',
    meme: '"우리 조 단톡방 팠어! 다들 확인 좀 🙏"',
    memeTags: ['#챙김_대마왕', '#단톡방_개설자', '#리마인드_요정'],
    villain: '읽씹하면 개인 톡으로 옴 (합리적인 공포)',
    teamLine: '조가 실제로 모이느냐 마느냐는 이 사람에게 달려 있다.',
  },
  {
    code: 'ENFJ', nickname: '정의로운 사회운동가', emoji: '📣', group: 'NF',
    stack: ['Fe', 'Ni', 'Se', 'Ti'],
    keywords: ['동기부여', '설득', '비전공유', '코칭', '발표'],
    strengths: ['조원 각자의 강점에 맞춰 일을 배분한다', '발표에서 청중을 실제로 움직인다', '팀에 "왜 하는지"를 심어준다'],
    caution: '남 챙기느라 자기 파트를 뒤로 미룸',
    meme: '"다들 할 수 있어!! 우리 진짜 잘하고 있어!!"',
    memeTags: ['#인간_확성기', '#팀장_1순위', '#동기부여_자판기'],
    villain: '칭찬으로 일을 더 시킴 (그리고 다들 기분 좋게 함)',
    teamLine: '리더 없으면 이 사람이 리더다. 대개 그게 맞다.',
  },
  {
    code: 'ENTJ', nickname: '대담한 통솔자', emoji: '👑', group: 'NT',
    stack: ['Te', 'Ni', 'Se', 'Fi'],
    keywords: ['통솔', '목표설정', '결단', '구조화', '성과'],
    strengths: ['목표와 역할을 첫 회의에서 확정한다', '결정을 미루지 않아 일정이 안 밀린다', '전체 그림과 실행을 동시에 잡는다'],
    caution: '반대 의견을 비효율로 취급하면 조가 조용해진다',
    meme: '"회의 10분 컷. 각자 뭐 할지 정리해서 올려."',
    memeTags: ['#CEO_빙의', '#회의_10분컷', '#결론부터_말해'],
    villain: '첫 회의에서 이미 역할표를 완성해 옴 (반박 시 논리로 짐)',
    teamLine: '방향 잡고 밀어붙이는 데 이 유형만 한 사람이 없다.',
  },
];

/* ── 계산: 유형별 역량 점수 ──────────────────────────────────── */
function computeRawTraits(type) {
  const t = {};
  Object.keys(TRAIT_LABELS).forEach((k) => { t[k] = 0; });
  type.stack.forEach((fn, i) => {
    const w = STACK_WEIGHT[i];
    const contrib = FUNCTION_TRAITS[fn] || {};
    Object.entries(contrib).forEach(([trait, v]) => { t[trait] += v * w; });
  });
  type.code.split('').forEach((axis) => {
    Object.entries(AXIS_TRAITS[axis] || {}).forEach(([trait, v]) => { t[trait] += v; });
  });
  return t;
}

const MBTI = TYPES.map((type) => ({
  ...type,
  axes: {
    EI: type.code[0], SN: type.code[1], TF: type.code[2], JP: type.code[3],
  },
  groupInfo: GROUPS[type.group],
  functionNames: type.stack.map((f) => FUNCTIONS[f]),
  raw: computeRawTraits(type),
}));

/* 0~100 정규화 (min-max) — 유형 간 상대 비교가 가능해진다 */
(function normalize() {
  Object.keys(TRAIT_LABELS).forEach((trait) => {
    const vals = MBTI.map((t) => t.raw[trait]);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = max - min || 1;
    MBTI.forEach((t) => {
      t.traits = t.traits || {};
      t.traits[trait] = Math.round(((t.raw[trait] - min) / span) * 100);
    });
  });
})();

const MBTI_BY_CODE = Object.fromEntries(MBTI.map((t) => [t.code, t]));
const ALL_CODES = MBTI.map((t) => t.code);
