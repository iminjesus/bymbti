/* bymbti — 역할 배정 엔진 */

/* 유형×역할 점수: 역할 적합도 × 질문이 요구하는 우선순위 */
function scoreTypeRole(type, role, analysis) {
  const fit = roleFit(type, role);
  const pr = analysis.rolePriority.find((p) => p.role.id === role.id);
  const priority = pr ? pr.priority : 1;
  return fit * priority;
}

/* 왜 이 역할인지: 실제로 점수를 끌어올린 역량 2개를 근거로 제시 */
function explainMatch(type, role) {
  const parts = Object.entries(role.need)
    .map(([trait, w]) => ({ trait, label: TRAIT_LABELS[trait], val: type.traits[trait] || 0, w }))
    .sort((a, b) => (b.val * b.w) - (a.val * a.w))
    .slice(0, 2);
  const fnName = FUNCTIONS[type.stack[0]].name;
  return `${type.code}의 ${parts.map((p) => `${p.label} ${p.val}`).join(', ')} — 주기능 ${type.stack[0]}(${fnName})이 이 역할에 그대로 꽂힌다.`;
}

/* ── 모드 1: 16유형 전체 ─────────────────────────────────────── */
function assignAllTypes(analysis) {
  return MBTI.map((type) => {
    const ranked = analysis.roleSet
      .map((role) => ({ role, score: scoreTypeRole(type, role, analysis) }))
      .sort((a, b) => b.score - a.score);
    return {
      type,
      primary: ranked[0],
      secondary: ranked[1],
      avoid: ranked[ranked.length - 1],
      ranked,
    };
  });
}

/* ── 모드 2: 우리 조 멤버 (중복 없는 최적 배정) ──────────────── */
function assignTeam(members, analysis) {
  if (!members.length) return { assignments: [], unfilled: [] };

  /* 후보 역할 풀은 인원수보다 넉넉하게 열어둔다 (억지 배치 방지).
     단, 이 과제에서 없으면 안 되는 상위 역할은 반드시 채워지도록 보너스를 준다. */
  const all = analysis.roleSet;
  const n = members.length;
  const poolSize = Math.min(all.length, n + 4);
  const ranked = analysis.rolePriority.slice(0, poolSize).map((p) => p.role);

  /* 3명 이상이면 그 상황의 중심 포지션(anchor)은 무조건 채운다 */
  const anchor = all.find((r) => r.anchor);
  const mustIds = [];
  if (n >= 3 && anchor) mustIds.push(anchor.id);
  analysis.rolePriority.forEach((p) => {
    if (mustIds.length < Math.min(3, n) && !mustIds.includes(p.role.id)) mustIds.push(p.role.id);
  });

  const must = mustIds.map((id) => analysis.roleLookup[id]);
  const rest = ranked.filter((r) => !mustIds.includes(r.id));
  const roles = must.concat(rest).slice(0, Math.max(poolSize, must.length));
  const mustFill = must.length;
  const BONUS = 10000;

  /* 실제 적합도 행렬 + 배정용(보너스 포함) 행렬 */
  const score = members.map((m) => roles.map((r) => scoreTypeRole(MBTI_BY_CODE[m.code], r, analysis)));
  const pick = score.map((row) => row.map((v, j) => v + (j < mustFill ? BONUS : 0)));

  /* 1단계: 전역 최대값 그리디 */
  const takenM = new Set();
  const takenR = new Set();
  const pairs = [];
  const cells = [];
  members.forEach((_, i) => roles.forEach((__, j) => cells.push({ i, j, s: pick[i][j] })));
  cells.sort((a, b) => b.s - a.s);
  cells.forEach(({ i, j }) => {
    if (takenM.has(i) || takenR.has(j)) return;
    takenM.add(i); takenR.add(j);
    pairs[i] = j;
  });

  /* 2단계: 두 명씩 자리 바꿔서 총점이 오르면 교환 (그리디 보정) */
  let improved = true;
  let guard = 0;
  while (improved && guard++ < 50) {
    improved = false;
    for (let a = 0; a < n; a++) {
      for (let b = a + 1; b < n; b++) {
        const cur = pick[a][pairs[a]] + pick[b][pairs[b]];
        const swap = pick[a][pairs[b]] + pick[b][pairs[a]];
        if (swap > cur + 1e-9) {
          const t = pairs[a]; pairs[a] = pairs[b]; pairs[b] = t;
          improved = true;
        }
      }
    }
  }

  const assignments = members.map((m, i) => {
    const type = MBTI_BY_CODE[m.code];
    const role = roles[pairs[i]];
    const own = all.map((r) => ({ role: r, score: scoreTypeRole(type, r, analysis) })).sort((x, y) => y.score - x.score);
    const rank = own.findIndex((r) => r.role.id === role.id) + 1;
    return {
      member: m,
      type,
      role,
      score: score[i][pairs[i]],
      rank,
      reason: explainMatch(type, role),
      note: rank === 1
        ? '본인 최적 역할 그대로 배정됨. 이견 없을 듯.'
        : `개인 최적은 ${own[0].role.name}${josa(own[0].role.name, '이지만/지만')}, 그 자리는 더 잘 맞는 사람이 있어 ${rank}순위로 배정했다.`,
    };
  });

  const used = new Set(pairs.map((j) => roles[j].id));
  const unfilled = analysis.rolePriority
    .slice(0, Math.max(4, mustFill + 2))
    .map((p) => p.role)
    .filter((r) => !used.has(r.id));

  return { assignments, unfilled };
}

/* ── 조 케미 진단 (재미 요소 + 실제 경고) ───────────────────── */
function diagnoseTeam(members) {
  if (members.length < 2) return [];
  const codes = members.map((m) => m.code);
  const count = (idx, ch) => codes.filter((c) => c[idx] === ch).length;
  const n = codes.length;
  const out = [];

  if (count(3, 'P') === n) out.push({ level: 'danger', emoji: '⏰', title: '전원 P 조', text: '계획은 아름답고 마감은 새벽 4시. 알람 담당을 강제로 한 명 지정하세요.' });
  if (count(3, 'J') === n) out.push({ level: 'warn', emoji: '📏', title: '전원 J 조', text: '일정은 완벽한데 "그냥 해보자"가 없음. 아이디어 발산 시간을 일부러 30분 비워두세요.' });
  if (count(0, 'I') === n) out.push({ level: 'warn', emoji: '🤫', title: '전원 I 조', text: '단톡방이 고요합니다. 회의는 짧게, 대신 문서로 소통하면 오히려 효율 최상.' });
  if (count(0, 'E') === n) out.push({ level: 'warn', emoji: '🔊', title: '전원 E 조', text: '회의는 즐거운데 기록이 안 남습니다. 서기를 반드시 고정하세요.' });
  if (count(2, 'T') === n) out.push({ level: 'warn', emoji: '🧊', title: '전원 T 조', text: '결론은 빠른데 아무도 안 챙깁니다. 팩폭 수위 조절 담당이 필요합니다.' });
  if (count(2, 'F') === n) out.push({ level: 'warn', emoji: '🫶', title: '전원 F 조', text: '다들 서로 배려하다 결론이 안 납니다. "그럼 이걸로 확정" 외칠 사람 한 명 정하세요.' });
  if (count(1, 'N') === n) out.push({ level: 'warn', emoji: '☁️', title: '전원 N 조', text: '발상은 화려한데 근거가 비어 있을 수 있음. 팩트체크 담당을 이중으로 두세요.' });
  if (count(1, 'S') === n) out.push({ level: 'warn', emoji: '🧱', title: '전원 S 조', text: '자료는 탄탄한데 결론이 평범해질 위험. 일부러 "말도 안 되는 안" 하나를 넣어보세요.' });

  const hasJ = count(3, 'J') > 0;
  const hasE = count(0, 'E') > 0;
  if (hasJ && hasE && out.length === 0) out.push({ level: 'good', emoji: '✅', title: '균형 잡힌 조합', text: '추진할 사람도 있고 챙길 사람도 있습니다. 이대로면 제출은 확실합니다.' });
  if (out.length === 0) out.push({ level: 'good', emoji: '🎯', title: '무난한 조합', text: '특별한 지뢰는 없습니다. 역할표대로만 굴러가면 됩니다.' });
  return out;
}

/* 잘 맞는 짝: 내 약점 역량을 상대가 메워주고, 소통 축이 겹치는 유형 */
function bestPartner(type) {
  const weak = Object.entries(type.traits).sort((a, b) => a[1] - b[1]).slice(0, 4).map(([k]) => k);
  let best = null;
  MBTI.forEach((other) => {
    if (other.code === type.code) return;
    const cover = weak.reduce((s, k) => s + other.traits[k], 0) / weak.length;
    const shared = other.code.split('').filter((c, i) => c === type.code[i]).length;
    const s = cover + shared * 6;
    if (!best || s > best.s) best = { s, other };
  });
  return best.other;
}
