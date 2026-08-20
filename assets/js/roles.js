/* bymbti — 역할 카탈로그
 * need: 이 역할에 필요한 역량 가중치 (mbti-data.js의 TRAIT_LABELS 키)
 */
const ROLES = [
  {
    id: 'leader', name: '팀장 · 총괄', emoji: '👑',
    need: { leadership: 1.0, planning: .7, persuasion: .5, execution: .4 },
    duty: '목표와 마감을 확정하고, 누가 뭘 할지 첫 회의에서 못 박는다.',
    mission: '"우리 조 결론은 이거다"를 한 문장으로 정하고 일정표를 만든다.',
    warn: '결정은 빠르게, 통보는 부드럽게.',
  },
  {
    id: 'pm', name: '일정 · 진행 관리', emoji: '📅',
    need: { planning: 1.0, detail: .7, leadership: .4, writing: .3 },
    duty: '마감 역산 일정표를 만들고 진행률을 추적한다. 무임승차 감지기.',
    mission: '제출일에서 거꾸로 3개 체크포인트를 잡고 단톡방에 고정한다.',
    warn: '리마인드는 하루 한 번까지만. 그 이상은 공포다.',
  },
  {
    id: 'research', name: '자료조사', emoji: '🔎',
    need: { research: 1.0, detail: .8, analysis: .5 },
    duty: '통계·논문·사례를 모으고 출처를 정리한다.',
    mission: '핵심 근거 5개를 출처 링크와 함께 표로 만든다.',
    warn: '자료 수집은 재밌다. 그러다 밤샌다. 개수 상한을 정해라.',
  },
  {
    id: 'ideation', name: '아이디어 발산', emoji: '💡',
    need: { ideation: 1.0, persuasion: .4, presentation: .3 },
    duty: '뻔하지 않은 관점과 접근을 최대한 많이 던진다.',
    mission: '30분 안에 아이디어 20개, 그중 3개를 골라 넘긴다.',
    warn: '발산은 30분까지. 그다음은 수렴 담당에게 마이크를 넘길 것.',
  },
  {
    id: 'analysis', name: '논리 검증 · 팩트체크', emoji: '🧩',
    need: { analysis: 1.0, detail: .7, research: .4 },
    duty: '용어 정의를 잡고, 근거와 결론 사이 논리 구멍을 메운다.',
    mission: '주장마다 "근거 있음/없음"을 표시하고 반례를 붙인다.',
    warn: '완벽한 정의를 찾다가 제출일을 넘기지 말 것.',
  },
  {
    id: 'presenter', name: '발표', emoji: '🎤',
    need: { presentation: 1.0, persuasion: .7, leadership: .3 },
    duty: '무대에서 결론을 전달하고 시선을 붙잡는다.',
    mission: '첫 30초 오프닝과 마지막 한 문장을 외울 정도로 준비한다.',
    warn: '대본 그대로 읽으면 잘하는 사람도 못하는 사람이 된다.',
  },
  {
    id: 'design', name: '자료 디자인 · 시각화', emoji: '🎨',
    need: { design: 1.0, detail: .5, ideation: .4 },
    duty: 'PPT·그래프·인포그래픽을 만들어 내용을 눈에 박히게 한다.',
    mission: '슬라이드당 메시지 1개 원칙으로 전체 톤을 통일한다.',
    warn: '애니메이션 3개 이상은 감점 요인이다.',
  },
  {
    id: 'writer', name: '보고서 작성', emoji: '📝',
    need: { writing: 1.0, detail: .7, analysis: .5 },
    duty: '조각난 자료를 하나의 문서로 꿰맞추고 문장을 다듬는다.',
    mission: '서론-본론-결론 뼈대를 먼저 잡고 각자 파트를 채워 넣게 한다.',
    warn: '남의 문체를 전부 자기 문체로 갈아엎으면 시간이 두 배 든다.',
  },
  {
    id: 'harmony', name: '팀 조율 · 분위기', emoji: '🤝',
    need: { harmony: 1.0, presentation: .4, planning: .3 },
    duty: '일정 조율, 갈등 중재, 말 없는 조원의 의견 끌어내기.',
    mission: '회의마다 아직 말 안 한 사람에게 먼저 마이크를 준다.',
    warn: '모두를 만족시키려다 결론이 사라지는 게 최대 함정.',
  },
  {
    id: 'field', name: '실행 · 섭외 · 현장', emoji: '🏃',
    need: { execution: 1.0, persuasion: .6, presentation: .3 },
    duty: '설문·인터뷰·실험·외부 연락 등 몸으로 뛰는 파트를 맡는다.',
    mission: '가장 미루기 쉬운 "연락해야 하는 일"을 오늘 안에 끝낸다.',
    warn: '즉흥 실행 전에 팀장에게 한 줄 공유는 하고 가자.',
  },
  {
    id: 'scribe', name: '서기 · 회의록', emoji: '🗂️',
    need: { writing: .9, detail: 1.0, harmony: .3 },
    duty: '결정 사항과 담당자를 기록해 "그때 그렇게 정했잖아"를 방지한다.',
    mission: '회의 끝나고 10분 안에 결정/담당/기한 3줄 요약을 올린다.',
    warn: '받아쓰기 말고 결정 사항만. 전문(全文) 기록은 아무도 안 읽는다.',
  },
  {
    id: 'devil', name: '리스크 점검 (악마의 변호인)', emoji: '😈',
    need: { analysis: .9, ideation: .7, detail: .5 },
    duty: '"교수님이 여기 찌르면?"을 미리 찔러본다.',
    mission: '예상 질문 10개를 뽑아 각각 답변 한 줄씩 준비한다.',
    warn: '태클은 발표 3일 전까지만. 전날엔 응원만 하자.',
  },
];

const ROLES_BY_ID = Object.fromEntries(ROLES.map((r) => [r.id, r]));

/* 역할 적합도 = 정규화된 need 가중 평균 */
function roleFit(type, role) {
  let sum = 0;
  let wsum = 0;
  Object.entries(role.need).forEach(([trait, w]) => {
    sum += (type.traits[trait] || 0) * w;
    wsum += w;
  });
  return wsum ? sum / wsum : 0;
}
