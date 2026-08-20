/* bymbti — MBTI별 "예상 정답" 생성기 (규칙 기반)
 * 질문 분석 결과 + 유형의 인지기능 스택을 조합해 답변을 만든다.
 * 조사(助詞) 사고를 피하려고 모든 템플릿은 "~ 관점에서 / ~ 기준으로 / ~ 중심으로"처럼
 * 받침과 무관하게 붙는 형태만 쓴다.
 */

/* 주기능별 답변 접근 */
const FUNC_APPROACH = {
  Ni: '겉으로 드러난 현상 말고 그 밑에 깔린 구조부터 짚고, 10년 뒤 그림을 먼저 그린다',
  Ne: '가능한 관점을 넓게 펼쳐놓고, 상관없어 보이던 것들을 억지로라도 연결한다',
  Si: '검증된 자료와 지난 선례를 모아 사실관계부터 확정한다',
  Se: '지금 눈앞에서 확인되는 현실과 당장 해볼 수 있는 행동부터 붙잡는다',
  Ti: '용어 정의와 인과관계를 정확히 쪼개서 논리 구멍부터 메운다',
  Te: '목표와 측정 지표를 먼저 세우고 실행 순서를 역산한다',
  Fi: '무엇이 옳은지, 누가 가장 피해를 보는지를 기준점으로 삼는다',
  Fe: '누가 이 결론을 받아들여야 하는지, 어떻게 말해야 움직이는지부터 본다',
};

/* 부기능이 붙여주는 보완 문장 */
const FUNC_SUPPORT = {
  Ni: '거기에 장기적 의미를 한 겹 얹는다',
  Ne: '거기에 아무도 안 꺼낸 대안을 몇 개 덧붙인다',
  Si: '거기에 실제 사례와 숫자를 채워 넣는다',
  Se: '거기에 바로 실행 가능한 행동을 붙인다',
  Ti: '거기에 논리적 일관성 검증을 한 번 돌린다',
  Te: '거기에 담당자와 기한이 적힌 실행 계획을 붙인다',
  Fi: '거기에 "그래서 이게 왜 중요한가"라는 진심을 심는다',
  Fe: '거기에 듣는 사람이 납득할 표현을 입힌다',
};

/* 결과물의 형태 */
const FUNC_OUTPUT = {
  Ni: '핵심 원인 하나를 지목한 뒤 거기서 뻗어 나가는 시나리오형 답',
  Ne: '선택지를 여러 개 펼쳐놓고 가장 신선한 것을 미는 답',
  Si: '출처와 연도가 정확히 붙은 사실 중심의 답',
  Se: '"당장 이것부터 하면 된다"로 끝나는 현실 밀착형 답',
  Ti: '정의 → 전제 → 결론이 빈틈없이 이어지는 답',
  Te: '수치 목표와 실행 단계가 표로 정리된 답',
  Fi: '가치 판단이 분명히 드러나는, 사람 중심의 답',
  Fe: '청중이 고개를 끄덕이게 만드는 공감형 답',
};

/* 열등기능이 만드는 함정 */
const FUNC_TRAP = {
  Ni: '근거 없이 확신만 강해질 수 있다',
  Ne: '가능성만 늘리다 결론을 못 낸다',
  Si: '전례에 갇혀 새로운 답을 놓친다',
  Se: '눈앞만 보다 장기 관점이 빠진다',
  Ti: '정의 다듬다가 제출 기한을 놓친다',
  Fi: '주관이 세서 반론을 못 받아들일 수 있다',
  Te: '속도를 내다 디테일이 날아간다',
  Fe: '분위기 맞추다 할 말을 못 한다',
};

/* 톤: E/I × T/F 로 말투를 나눈다 */
function toneOf(code) {
  const e = code[0] === 'E';
  const t = code[2] === 'T';
  if (e && t) return { style: '결론부터 짧게 던지는 말투', open: '결론부터 말하면,' };
  if (e && !t) return { style: '사람을 끌어들이는 따뜻한 말투', open: '제 생각엔 이거예요,' };
  if (!e && t) return { style: '조용하지만 근거가 촘촘한 말투', open: '정리해서 말하면,' };
  return { style: '조심스럽게 꺼내는 진심 어린 말투', open: '조심스럽지만,' };
}

function buildAnswer(type, analysis) {
  return analysis.isAssignment
    ? buildAssignmentAnswer(type, analysis)
    : buildSceneAnswer(type, analysis);
}

/* ── 과제형: 답변 축을 따라 정리된 "예상 정답" ───────────────── */
function buildAssignmentAnswer(type, analysis) {
  const [dom, aux, , inf] = type.stack;
  const topic = analysis.topic;
  const tone = toneOf(type.code);

  const lensDom = FUNCTIONS[dom].lens;
  const lensAux = FUNCTIONS[aux].lens;
  const bullets = analysis.axes.map((axis, i) => {
    const lens = i % 2 === 0 ? lensDom : lensAux;
    return { label: axis.label, text: `${lens} 관점에서 ${axis.verb}` };
  });

  const kw = type.keywords.slice(0, 2);
  const flavor = `${kw.join('·')}${josa(kw[kw.length - 1], '이/가')} 강한 편이라, ${type.strengths[0]}.`;

  const body =
    `${type.code}${josa(type.code, '는/는')} "${topic}"${josa(topic, '을/를')} 받으면 먼저 ${FUNC_APPROACH[dom]}. ` +
    `그다음 ${FUNC_SUPPORT[aux]}. ` +
    `그래서 최종 답은 ${FUNC_OUTPUT[dom]}${josa(FUNC_OUTPUT[dom], '으로/로')} 나온다. ` +
    `특히 ${flavor}`;

  return {
    summary: FUNC_OUTPUT[dom],
    body,
    bullets,
    quote: `${tone.open} ${QUOTE_TEMPLATES[dom](topic)}`,
    tone: tone.style,
    trap: FUNC_TRAP[inf],
    lens: lensDom,
    decision: null,
  };
}

/* ── 일상형: 질문에 대한 "실제 대답"이 중심 ─────────────────── */
function buildSceneAnswer(type, analysis) {
  const [dom, aux, , inf] = type.stack;
  const scene = analysis.scene;
  const tone = toneOf(type.code);
  const decision = decideFor(type, analysis.options);

  /* 이 유형이 실제로 내놓는 답 */
  let verdict = scene.verdict[dom];
  if (decision) {
    const line = CHOICE_LINE[dom]
      .replace(/\{PICK\}/g, decision.pick)
      .replace(/\{OTHER\}/g, decision.other);
    verdict = `${line} ${verdict}`;
  }
  verdict = `${verdict} ${AUX_TAIL[aux]}`;

  const kw = type.keywords.slice(0, 2);
  const body =
    `${type.code}${josa(type.code, '는/는')} ${scene.approach[dom]}. ` +
    `그다음 ${SUPPORT_LINE[aux]}. ` +
    `${kw.join('·')}${josa(kw[kw.length - 1], '이/가')} 강한 유형이라 이 상황에서도 그게 그대로 나온다.`;

  const bullets = [
    { label: '접근', text: scene.approach[dom] },
    { label: '보완', text: SUPPORT_LINE[aux] },
  ];
  if (decision) bullets.unshift({ label: '선택', text: decision.vote });

  return {
    summary: decision ? decision.vote : scene.label + '에서의 반응',
    body,
    bullets,
    quote: `${tone.open} ${verdict}`,
    verdict,
    tone: tone.style,
    trap: FUNC_TRAP[inf],
    lens: FUNCTIONS[dom].lens,
    decision,
  };
}

/* 회의에서 실제로 할 법한 한마디 — 유형 밈 + 질문 주제를 섞는다 */
const QUOTE_TEMPLATES = {
  Ni: (t) => `"${t}"${josa(t, '은/는')} 증상이고, 진짜 문제는 그 뒤에 있어. 거기부터 건드리자.`,
  Ne: (t) => `"${t}" 말고 이걸 이렇게 비틀면 훨씬 재밌어지는데, 들어볼래?`,
  Si: (t) => `"${t}" 관련해서 작년 자료 있어. 출처 정리해서 올릴게.`,
  Se: (t) => `"${t}" 말로 하지 말고 일단 하나 만들어서 보자. 내가 해올게.`,
  Ti: (t) => `잠깐, "${t}"에서 그 용어 정의부터 맞추고 가야 해.`,
  Te: (t) => `"${t}" 담당이랑 기한 지금 정하자. 회의 10분 컷.`,
  Fi: (t) => `"${t}"에서 제일 손해 보는 사람이 누군지는 꼭 넣었으면 좋겠어.`,
  Fe: (t) => `"${t}" 다들 어떻게 생각해? 일단 한 명씩 의견 듣고 갈게!`,
};

/* 유형별 최종 카드 데이터 */
function buildTypeCard(type, analysis, assignment) {
  return {
    type,
    answer: buildAnswer(type, analysis),
    primary: assignment.primary,
    secondary: assignment.secondary,
    avoid: assignment.avoid,
    partner: bestPartner(type),
    reason: explainMatch(type, assignment.primary.role),
  };
}
