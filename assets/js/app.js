/* bymbti — UI */
(() => {
  const APP_VERSION = '20';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const EXAMPLES = [
    '오늘 짜장면 먹을까 짬뽕 먹을까',
    'AI가 일자리를 증가시킨다 vs 감소시킨다',
    '오징어게임 다리 건너기, 1~16번 중에 몇 번 고를래?',
    '내가 슬퍼서 빵을 샀어',
    '오늘 비 온다는데 우산 챙길까 말까',
    '읽씹 3일째인데 내가 먼저 연락할까',
    '이거 지금 살까 다음 달에 살까',
    '이번 주말에 뭐하지',
    '지구 온난화의 영향과 해결 방안에 대해 조사하고 발표하시오',
    'AI가 일자리에 미치는 영향 — 찬반 토론 준비',
    '우리 학교 축제 홍보 캠페인을 기획하라',
  ];

  const state = {
    mode: 'all',
    members: [],
    analysis: null,
    filter: 'ALL',
    aiCache: {},
  };

  /* ── 초기화 ─────────────────────────────────────────────── */
  function init() {
    $('#examples').innerHTML = EXAMPLES
      .map((e) => `<button class="chip" data-ex="${esc(e)}">${esc(e)}</button>`).join('');
    $('#examples').addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-ex]');
      if (!b) return;
      $('#q').value = b.dataset.ex;
      run();
    });

    $('#mCode').innerHTML = ALL_CODES
      .map((c) => `<option value="${c}">${c} · ${MBTI_BY_CODE[c].nickname}</option>`).join('');

    $('#modeTabs').addEventListener('click', (ev) => {
      const t = ev.target.closest('.tab');
      if (!t) return;
      state.mode = t.dataset.mode;
      $$('.tab').forEach((x) => x.classList.toggle('on', x === t));
      $('#teamPanel').style.display = state.mode === 'team' ? 'block' : 'none';
      if (state.analysis) run();
    });

    $('#run').addEventListener('click', run);
    $('#q').addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') run();
    });

    $('#addMember').addEventListener('click', addMember);
    $('#mName').addEventListener('keydown', (e) => { if (e.key === 'Enter') addMember(); });
    $('#randomTeam').addEventListener('click', randomTeam);
    $('#members').addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-del]');
      if (!b) return;
      state.members.splice(Number(b.dataset.del), 1);
      renderMembers();
      if (state.analysis) run();
    });

    $('#saveKey').addEventListener('click', () => {
      LLM.setKey($('#apiKey').value.trim());
      $('#apiKey').value = '';
      keyState();
    });
    $('#clearKey').addEventListener('click', () => { LLM.setKey(''); keyState(); });
    keyState();

    $('#appVersion').textContent = `v${APP_VERSION}`;
    $('#hardReset').addEventListener('click', hardReset);
  }

  /* 설치된 앱이 옛 파일을 붙잡고 있을 때의 탈출구.
     서비스 워커를 해제하고 캐시를 전부 지운 뒤 다시 받는다. */
  async function hardReset(ev) {
    const btn = ev.currentTarget;
    btn.disabled = true;
    btn.textContent = '비우는 중…';
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      if (window.caches) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch (e) { /* 실패해도 새로고침은 시도한다 */ }
    window.location.replace(`index.html?fresh=${Date.now()}`);
  }

  function keyState() {
    $('#keyState').innerHTML = LLM.hasKey()
      ? `✅ 키 저장됨 — 결과 카드에서 <b>AI로 다시 쓰기</b> 버튼을 쓸 수 있습니다. (모델: ${LLM.MODEL})`
      : '🔒 저장된 키 없음 — 규칙 기반 모드로 동작합니다.';
  }

  /* ── 멤버 ───────────────────────────────────────────────── */
  function addMember() {
    const name = $('#mName').value.trim() || `조원${state.members.length + 1}`;
    state.members.push({ name, code: $('#mCode').value });
    $('#mName').value = '';
    $('#mName').focus();
    renderMembers();
    if (state.analysis) run();
  }

  function randomTeam() {
    const names = ['지민', '서준', '하윤', '도현', '수아', '민재', '예은', '태호'];
    const pool = [...ALL_CODES];
    state.members = Array.from({ length: 4 }, (_, i) => ({
      name: names[Math.floor(Math.random() * names.length)] + (i ? i + 1 : ''),
      code: pool.splice(Math.floor(Math.random() * pool.length), 1)[0],
    }));
    renderMembers();
    if (state.analysis) run();
  }

  function renderMembers() {
    const el = $('#members');
    if (!state.members.length) {
      el.innerHTML = '<span class="subline">아직 조원이 없습니다. 이름과 MBTI를 추가해 보세요.</span>';
      return;
    }
    el.innerHTML = state.members.map((m, i) => {
      const t = MBTI_BY_CODE[m.code];
      return `<span class="member-tag">${t.emoji} <b>${esc(m.name)}</b> <em>${m.code}</em>
        <button data-del="${i}" title="삭제">×</button></span>`;
    }).join('');
  }

  /* ── 실행 ───────────────────────────────────────────────── */
  function run() {
    const q = $('#q').value.trim();
    if (!q) {
      $('#result').innerHTML = '<div class="panel empty">질문을 먼저 입력해 주세요. 위 예시를 눌러도 됩니다. 👆</div>';
      return;
    }
    setVariantSeed(Math.floor(Math.random() * 1e9));
    state.analysis = analyzeQuestion(q);
    state.aiCache = {};
    render();
    $('#result').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function render() {
    const a = state.analysis;
    let html = analysisSection(a);
    if (a.options) html += voteSection(a);
    if (a.pick) html += pickSection(a);
    else if (!a.options) html += commitSection(a);   // 선택지가 있으면 투표 결과가 곧 답
    html += tfSection(a);
    html += ieSection(a);
    if (a.isAssignment) html += roadmapSection(a);
    html += state.mode === 'team' ? teamSection(a) : '';
    html += typesSection(a);
    $('#result').innerHTML = html;
    bindResult();
  }

  /* 이 앱의 말투: 과제냐 일상이냐에 따라 라벨을 통째로 바꾼다 */
  function words(a) {
    return a.isAssignment
      ? { unit: '과제', role: '역할', team: '우리 조', roleQ: '이 과제에서 맡아야 할 역할' }
      : { unit: '상황', role: '포지션', team: '우리 무리', roleQ: '이 상황에서 맡는 포지션' };
  }

  /* ── 1. 과제 분석 ───────────────────────────────────────── */
  function analysisSection(a) {
    const w = words(a);
    const third = a.isAssignment
      ? { k: '답변에 들어가야 할 축', v: a.axes.map((x) => esc(x.label)).join(' · ') }
      : a.options
        ? { k: '갈라진 선택지', v: a.options.map((o) => esc(o)).join('  vs  ') }
        : { k: '이 상황에서 필요한 것', v: a.topTraits.length ? a.topTraits.map((t) => esc(t.label)).join(' · ') : '균형' };

    return `
    <h2 class="section-title">🧭 ${w.unit} 분석 <small>입력한 질문을 이렇게 읽었습니다</small></h2>
    <section class="panel">
      <div class="meta-grid">
        <div class="meta"><div class="k">${w.unit} 유형</div><div class="v">${a.kindEmoji} ${esc(a.kindLabel)}</div></div>
        <div class="meta"><div class="k">핵심 주제</div><div class="v">${esc(a.topic)}</div></div>
        <div class="meta"><div class="k">${third.k}</div><div class="v">${third.v}</div></div>
      </div>
      <div class="tagline-pills">
        ${a.topTraits.length
    ? `<span class="pill">이 ${w.unit}에 특히 필요한 역량</span>` + a.topTraits.map((t) => `<span class="pill">${esc(t.label)}</span>`).join('')
    : '<span class="pill">특정 역량 편중 없음 — 균형 배정</span>'}
      </div>
    </section>`;
  }

  /* ── 1.5 16유형 투표 결과 (양자택일 질문일 때) ──────────── */
  function voteSection(a) {
    const tally = {};
    MBTI.forEach((t) => {
      const d = decideFor(t, a.options);
      (tally[d.vote] = tally[d.vote] || []).push(t);
    });
    const rows = Object.entries(tally).sort((x, y) => y[1].length - x[1].length);
    const top = rows[0];
    const tie = rows.length > 1 && rows[1][1].length === top[1].length;

    /* 선택지 내용에 방향이 있으면 어떤 축으로 갈렸는지 밝힌다 */
    const ax = decidingAxis(a.options);
    const axisNote = ax ? (() => {
      const pa = profileOption(a.options[0]);
      const pb = profileOption(a.options[1]);
      const first = pa[ax.axis] > pb[ax.axis] ? 'pos' : 'neg';
      const second = first === 'pos' ? 'neg' : 'pos';
      return `
      <div class="axis-note">
        🧭 이 선택지는 <b>${esc(OPTION_AXES[ax.axis].label)}</b> 축으로 갈립니다.<br>
        <span>“${esc(a.options[0])}” 쪽 — ${esc(AXIS_REASON[ax.axis][first])}</span>
        <span>“${esc(a.options[1])}” 쪽 — ${esc(AXIS_REASON[ax.axis][second])}</span>
      </div>`;
    })() : '';

    return `
    <h2 class="section-title">🗳️ 16유형 투표 결과 <small>그래서 다수는 이쪽입니다</small></h2>
    <section class="panel">
      <div class="verdict-line">
        ${tie
    ? `😐 <b>${esc(top[0])}</b> 와(과) <b>${esc(rows[1][0])}</b> 동률. 이럴 땐 그냥 가위바위보 하세요.`
    : `🏆 <b>${esc(top[0])}</b> — ${top[1].length}표로 1위. 근데 소수 의견도 한 번 보세요.`}
      </div>
      ${axisNote}
      <div class="votes">
        ${rows.map(([label, list]) => `
          <div class="vote">
            <div class="vhead"><b>${esc(label)}</b><span>${list.length}표</span></div>
            <div class="vbar"><i style="width:${Math.round((list.length / 16) * 100)}%"></i></div>
            <div class="vtypes">${list.map((t) => `<span>${t.emoji} ${t.code}</span>`).join('')}</div>
          </div>`).join('')}
      </div>
    </section>`;
  }

  /* ── 1.6 번호 배정표 ("몇 번 고를래?") ─────────────────── */
  function pickSection(a) {
    const rows = MBTI
      .map((t) => ({ t, ...pickFor(t, a.pick) }))
      .sort((x, y) => x.num - y.num || x.rank - y.rank);

    const span = a.pick.hi - a.pick.lo;
    const first = rows[0];
    const last = rows[rows.length - 1];

    return `
    <h2 class="section-title">🔢 16유형 번호 배정표 <small>${esc(a.pick.label)} · 같은 판, 16가지 계산</small></h2>
    <section class="panel">
      <div class="verdict-line">
        🥇 제일 먼저 부르는 건 <b>${first.t.code}</b>(${first.num}번),
        끝까지 기다리는 건 <b>${last.t.code}</b>(${last.num}번).
        앞으로 갈수록 정보가 없고, 뒤로 갈수록 시간이 없습니다.
      </div>
      <div class="picks">
        ${rows.map((r) => `
          <div class="pick-row">
            <div class="pick-num" style="--h:${Math.round(210 + (span ? (r.num - a.pick.lo) / span : 0.5) * 120)}">${r.num}</div>
            <div>
              <div class="pick-who">${r.t.emoji} <b>${r.t.code}</b> <em>${esc(r.t.nickname)}</em></div>
              <div class="pick-why">${esc(r.why)}</div>
            </div>
          </div>`).join('')}
      </div>
    </section>`;
  }

  /* ── 1.6b 최종 답 (선택지도 숫자도 없을 때) ─────────────── */
  function commitSection(a) {
    const sceneId = a.isAssignment ? 'assignment' : a.scene.id;
    const rows = PICK_ORDER.map((code) => {
      const t = MBTI_BY_CODE[code];
      return { t, ...commitFor(t, sceneId) };
    });

    return `
    <h2 class="section-title">🎯 16유형의 답 <small>같은 질문, 16가지 선택</small></h2>
    <section class="panel">
      <div class="commits">
        ${rows.map((r) => `
          <div class="commit-row">
            <div class="commit-type"><span class="ce">${r.t.emoji}</span><b>${r.t.code}</b></div>
            <div>
              <div class="commit-ans">${esc(r.answer)}</div>
              <div class="commit-why">${esc(r.why)}</div>
            </div>
          </div>`).join('')}
      </div>
    </section>`;
  }

  /* ── 1.7 T vs F 대격돌 ─────────────────────────────────── */
  function tfSection(a) {
    const key = a.isAssignment ? 'assignment' : a.scene.id;
    const tf = TF_TALK[key] || TF_TALK.daily;

    return `
    <h2 class="section-title">⚔️ T vs F</h2>
    <section class="panel">
      <div class="duel">
        <div class="duel-side t">
          <div class="duel-head">🧊 T 진영 <em>${esc(tf.tLabel)}</em></div>
          <div class="duel-line">${esc(tf.tLine)}</div>
        </div>
        <div class="duel-vs">VS</div>
        <div class="duel-side f">
          <div class="duel-head">💗 F 진영 <em>${esc(tf.fLabel)}</em></div>
          <div class="duel-line">${esc(tf.fLine)}</div>
        </div>
      </div>

      <div class="clash">⚡ <b>충돌 지점</b> — ${esc(tf.clash)}</div>

      <div class="block" style="margin-top:16px">
        <div class="h">🔁 같은 말인데 이렇게 들린다</div>
        <div class="heard">
          ${tf.heard.map((h) => `
            <div class="heard-row">
              <div class="heard-said ${h.side === 'T' ? 't' : 'f'}">
                <span class="who">${h.side}가 한 말</span>${esc(h.said)}
              </div>
              <div class="heard-arrow">→</div>
              <div class="heard-got ${h.side === 'T' ? 'f' : 't'}">
                <span class="who">${h.side === 'T' ? 'F' : 'T'}가 들은 말</span>${esc(h.heard)}
              </div>
            </div>`).join('')}
        </div>
      </div>
    </section>`;
  }

  /* ── 1.8 I vs E ────────────────────────────────────────── */
  function ieSection(a) {
    const key = a.isAssignment ? 'assignment' : a.scene.id;
    const ie = IE_TALK[key] || IE_TALK.daily;

    return `
    <h2 class="section-title">🔋 I vs E</h2>
    <section class="panel">
      <div class="duel">
        <div class="duel-side i">
          <div class="duel-head">🌙 I 진영 <em>${esc(ie.iLabel)}</em></div>
          <div class="duel-line">${esc(ie.iLine)}</div>
        </div>
        <div class="duel-vs">VS</div>
        <div class="duel-side e">
          <div class="duel-head">☀️ E 진영 <em>${esc(ie.eLabel)}</em></div>
          <div class="duel-line">${esc(ie.eLine)}</div>
        </div>
      </div>

      <div class="clash">⚡ <b>충돌 지점</b> — ${esc(ie.clash)}</div>

      <div class="block" style="margin-top:16px">
        <div class="h">🔁 같은 말인데 이렇게 들린다</div>
        <div class="heard">
          ${ie.heard.map((h) => `
            <div class="heard-row">
              <div class="heard-said ${h.side === 'I' ? 'i' : 'e'}">
                <span class="who">${h.side}가 한 말</span>${esc(h.said)}
              </div>
              <div class="heard-arrow">→</div>
              <div class="heard-got ${h.side === 'I' ? 'e' : 'i'}">
                <span class="who">${h.side === 'I' ? 'E' : 'I'}가 들은 말</span>${esc(h.heard)}
              </div>
            </div>`).join('')}
        </div>
      </div>
    </section>`;
  }

  /* ── 2. 로드맵 ──────────────────────────────────────────── */
  function roadmapSection(a) {
    const steps = buildRoadmap(a);
    return `
    <h2 class="section-title">🗓️ 진행 로드맵 <small>단계마다 누가 주도할지까지</small></h2>
    <section class="panel"><div class="roadmap">
      ${steps.map((s) => `
        <div class="step">
          <div class="s">${esc(s.step)}</div>
          <div>
            <div class="d">${esc(s.desc)}</div>
            <div class="r">${s.roles.map((r) => `<span class="rolebadge">${r.emoji} ${esc(r.name)}</span>`).join('')}</div>
          </div>
        </div>`).join('')}
    </div></section>`;
  }

  /* ── 3. 우리 조 배정 ────────────────────────────────────── */
  function teamSection(a) {
    const w = words(a);
    if (!state.members.length) {
      return `<h2 class="section-title">👥 ${w.team} ${w.role} 배정</h2>
        <section class="panel empty">위에서 사람을 추가하면 겹치지 않게 ${w.role}을 나눠드립니다.<br>
        급하면 <b>🎲 랜덤 4인조</b>를 눌러 보세요.</section>`;
    }
    const { assignments, unfilled } = assignTeam(state.members, a);
    const diag = diagnoseTeam(state.members);

    return `
    <h2 class="section-title">👥 ${w.team} ${w.role} 배정 <small>${state.members.length}명 · 중복 없이 최적 배치</small></h2>
    <section class="panel">
      <div class="assign">
        ${assignments.map((x) => `
          <div class="assign-card">
            <div class="ic">${x.type.emoji}</div>
            <div>
              <div class="who">${esc(x.member.name)} <em>${x.type.code} · ${esc(x.type.nickname)}</em></div>
              <div class="role">${x.role.emoji} ${esc(x.role.name)}</div>
              <div class="duty">${esc(x.role.duty)}</div>
              <div class="mission">🎯 첫 미션 — ${esc(x.role.mission)}</div>
              <div class="why">📌 ${esc(x.note)}</div>
            </div>
          </div>`).join('')}
      </div>
      ${unfilled.length ? `<div class="warnbox" style="margin-top:14px">
        ⚠️ 인원이 부족해 <b>${unfilled.map((r) => esc(r.name)).join(', ')}</b> ${w.role}은 비어 있습니다.
        여유 있는 사람이 겸임하거나, 사람을 더 추가하세요.</div>` : ''}
    </section>

    <h2 class="section-title">🔮 ${w.team} 케미 진단 <small>미리 알면 피할 수 있습니다</small></h2>
    <section class="panel"><div class="diag">
      ${diag.map((d) => `<div class="diag-item ${d.level}"><div class="e">${d.emoji}</div>
        <div><b>${esc(d.title)}</b>${esc(d.text)}</div></div>`).join('')}
    </div></section>`;
  }

  /* ── 4. 16유형 카드 ─────────────────────────────────────── */
  function typesSection(a) {
    const assigns = assignAllTypes(a);
    const groups = ['ALL', 'NT', 'NF', 'SJ', 'SP'];
    const labels = { ALL: '전체 16유형', NT: '🧠 분석형 NT', NF: '💚 외교형 NF', SJ: '📋 관리자형 SJ', SP: '🔥 탐험가형 SP' };

    const cards = assigns
      .filter((x) => state.filter === 'ALL' || x.type.group === state.filter)
      .map((x) => typeCard(buildTypeCard(x.type, a, x), a)).join('');

    return `
    <h2 class="section-title">🧬 MBTI별 예상 정답 &amp; ${words(a).role} <small>같은 질문, 16가지 다른 답</small></h2>
    <section class="panel">
      <div class="filters">
        ${groups.map((g) => `<button class="filter ${state.filter === g ? 'on' : ''}" data-f="${g}">${labels[g]}</button>`).join('')}
      </div>
      <div class="row" style="margin-bottom:12px">
        ${LLM.hasKey() ? '<button class="ghost" id="aiAll">✨ 보이는 유형 전부 AI로 다시 쓰기</button>' : ''}
        <button class="ghost" id="reroll">🎲 다시 뽑기</button>
        <button class="ghost" id="copyAll">📋 결과 텍스트 복사</button>
        <button class="ghost" onclick="window.print()">🖨️ 인쇄 / PDF 저장</button>
      </div>
      <div class="cards">${cards}</div>
    </section>`;
  }

  function typeCard(c, a) {
    const t = c.type;
    const w = words(a);
    const barTraits = ['leadership', 'research', 'ideation', 'presentation', 'detail', 'harmony'];
    return `
    <article class="tcard g-${t.group}" data-code="${t.code}">
      <div class="head">
        <span class="emo">${t.emoji}</span>
        <div>
          <div class="code">${t.code}</div>
          <div class="nick">${esc(t.nickname)}</div>
        </div>
        <span class="grp">${t.groupInfo.emoji} ${esc(t.groupInfo.label)}</span>
      </div>

      <div class="block">
        <div class="h">💬 ${t.code}의 대답</div>
        <div class="say">
          <div class="say-meme">${esc(c.meme)}</div>
          <div class="say-main">${esc(c.answer.verdict || c.answer.quote)}</div>
        </div>
        <div class="memetags">${c.tags.map((m) => `<span>${esc(m)}</span>`).join('')}</div>
        ${c.answer.bullets.length ? `<ul>${c.answer.bullets.map((b) => `<li><b>${esc(b.label)}</b> — ${esc(b.text)}</li>`).join('')}</ul>` : ''}
      </div>

      <div class="why-line">🧠 ${esc(c.answer.why)}</div>
      <div class="trap">⚠️ ${esc(t.caution)}</div>

      <div class="roleline">
        <div class="lab">${w.roleQ}</div>
        <div class="val">${c.primary.role.emoji} ${esc(c.primary.role.name)}</div>
        <div class="sub">${esc(c.primary.role.duty)}</div>
        <div class="sub" style="margin-top:6px;color:var(--tx3)">서브 — ${c.secondary.role.emoji} ${esc(c.secondary.role.name)} · 안 맞는 ${w.role} — ${esc(c.avoid.role.name)}</div>
      </div>

      <details class="more">
        <summary>▸ 인지기능 · 강점 · 역량 더 보기</summary>
        <div class="block">
          <div class="h">🧠 인지기능 스택</div>
          <div class="p" style="font-size:13.5px;color:var(--tx2)">
            ${t.stack.map((f, i) => `${['주', '부', '3차', '열등'][i]} ${f}(${FUNCTIONS[f].name})`).join(' → ')}
          </div>
        </div>
        <div class="block">
          <div class="h">⭐ 이 유형의 강점</div>
          <ul>${t.strengths.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
        </div>
        <div class="block">
          <div class="h">📊 역량 프로필</div>
          <div class="bars">
            ${barTraits.map((k) => `<div class="bar"><span>${TRAIT_LABELS[k]}</span>
              <span class="t"><i style="width:${t.traits[k]}%"></i></span><span>${t.traits[k]}</span></div>`).join('')}
          </div>
        </div>
        <div class="block"><div class="h">🤝 이 ${w.unit}에서 잘 맞는 짝</div>
          <div class="p" style="font-size:13.5px">${c.partner.emoji} <b>${c.partner.code}</b> — ${esc(c.partner.teamLine)}</div>
        </div>
      </details>

      <div class="row" style="margin-top:12px">
        ${LLM.hasKey() ? `<button class="ghost" data-ai="${t.code}">✨ AI로 다시 쓰기</button>` : ''}
      </div>
      <div class="ai-slot"></div>
    </article>`;
  }

  /* ── 결과 영역 이벤트 ───────────────────────────────────── */
  function bindResult() {
    $$('#result .filter').forEach((b) => b.addEventListener('click', () => {
      state.filter = b.dataset.f;
      render();
    }));

    const rerollBtn = $('#reroll');
    if (rerollBtn) rerollBtn.addEventListener('click', () => {
      setVariantSeed(Math.floor(Math.random() * 1e9));
      render();
    });

    const copyBtn = $('#copyAll');
    if (copyBtn) copyBtn.addEventListener('click', copyAll);

    $$('#result [data-ai]').forEach((b) => b.addEventListener('click', () => aiRewrite([b.dataset.ai], b)));

    const aiAll = $('#aiAll');
    if (aiAll) {
      aiAll.addEventListener('click', () => {
        const codes = $$('#result .tcard').map((c) => c.dataset.code);
        aiRewrite(codes, aiAll);
      });
    }
  }

  async function aiRewrite(codes, btn) {
    const old = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Claude가 쓰는 중…';
    try {
      const list = await LLM.generate(state.analysis.question, codes);
      list.forEach((item) => {
        state.aiCache[item.code] = item;
        const card = $(`#result .tcard[data-code="${item.code}"]`);
        if (!card) return;
        card.querySelector('.ai-slot').innerHTML = `
          <div class="ai-out">
            <div class="h">✨ CLAUDE가 새로 쓴 답변</div>
            <div><b>${esc(item.summary || '')}</b></div>
            <div style="margin-top:5px">${esc(item.answer || '')}</div>
            ${item.quote ? `<div class="quote" style="margin-top:8px">${esc(item.quote)}</div>` : ''}
            ${item.tip ? `<div class="trap">⚠️ ${esc(item.tip)}</div>` : ''}
          </div>`;
      });
    } catch (e) {
      alert(`AI 생성 실패: ${e.message}`);
    } finally {
      btn.disabled = false;
      btn.innerHTML = old;
    }
  }

  function copyAll() {
    const a = state.analysis;
    const w = words(a);
    const lines = [`■ 질문: ${a.question}`, `■ ${w.unit} 유형: ${a.kindLabel} / ${a.output}`, ''];

    if (a.options) {
      const tally = {};
      MBTI.forEach((t) => { const d = decideFor(t, a.options); (tally[d.vote] = tally[d.vote] || []).push(t.code); });
      lines.push('■ 16유형 투표 결과');
      Object.entries(tally).sort((x, y) => y[1].length - x[1].length)
        .forEach(([label, list]) => lines.push(`- ${label}: ${list.length}표 (${list.join(', ')})`));
      lines.push('');
    }

    if (a.pick) {
      lines.push(`■ 번호 배정표 (${a.pick.label})`);
      MBTI.map((t) => ({ t, ...pickFor(t, a.pick) }))
        .sort((x, y) => x.num - y.num || x.rank - y.rank)
        .forEach((r) => lines.push(`- ${r.num}번 ${r.t.code}: ${r.why}`));
      lines.push('');
    }

    if (!a.pick && !a.options) {
      const sid = a.isAssignment ? 'assignment' : a.scene.id;
      lines.push('■ 16유형의 답');
      PICK_ORDER.forEach((code) => {
        const r = commitFor(MBTI_BY_CODE[code], sid);
        lines.push(`- ${code}: ${r.answer} (${r.why})`);
      });
      lines.push('');
    }

    const tfKey = a.isAssignment ? 'assignment' : a.scene.id;
    const tf = TF_TALK[tfKey] || TF_TALK.daily;
    lines.push('■ T vs F');
    lines.push(`- T 진영 (${tf.tLabel}): ${tf.tLine}`);
    lines.push(`- F 진영 (${tf.fLabel}): ${tf.fLine}`);
    lines.push(`- 충돌 지점: ${tf.clash}`);
    tf.heard.forEach((h) => lines.push(`- ${h.side}가 한 말 ${h.said} → ${h.side === 'T' ? 'F' : 'T'}가 들은 말 ${h.heard}`));
    lines.push('');

    const ie = IE_TALK[tfKey] || IE_TALK.daily;
    lines.push('■ I vs E');
    lines.push(`- I 진영 (${ie.iLabel}): ${ie.iLine}`);
    lines.push(`- E 진영 (${ie.eLabel}): ${ie.eLine}`);
    lines.push(`- 충돌 지점: ${ie.clash}`);
    ie.heard.forEach((h) => lines.push(`- ${h.side}가 한 말 ${h.said} → ${h.side === 'I' ? 'E' : 'I'}가 들은 말 ${h.heard}`));
    lines.push('');

    if (state.mode === 'team' && state.members.length) {
      lines.push(`■ ${w.team} ${w.role} 배정`);
      assignTeam(state.members, a).assignments.forEach((x) => {
        lines.push(`- ${x.member.name} (${x.type.code}) → ${x.role.name}: ${x.role.mission}`);
      });
      lines.push('');
    }

    lines.push(`■ MBTI별 예상 정답 & ${w.role}`);
    assignAllTypes(a)
      .filter((x) => state.filter === 'ALL' || x.type.group === state.filter)
      .forEach((x) => {
        const c = buildTypeCard(x.type, a, x);
        lines.push(`\n[${x.type.code} · ${x.type.nickname}] ${w.role}: ${c.primary.role.name}`);
        lines.push(`  답변: ${c.answer.verdict || c.answer.body}`);
        lines.push(`  한마디: ${c.answer.quote}`);
      });

    copyText(lines.join('\n'));
  }

  /* file:// 로 직접 열면 navigator.clipboard 가 없다. 그때는 execCommand 로 대체. */
  function copyText(text) {
    const done = () => alert('결과를 클립보드에 복사했습니다 📋');
    const fail = () => alert('복사에 실패했습니다. 인쇄 / PDF 저장을 이용해 주세요.');

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done).catch(() => legacyCopy(text) ? done() : fail());
      return;
    }
    if (legacyCopy(text)) done(); else fail();
  }

  function legacyCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }

  document.addEventListener('DOMContentLoaded', () => {
    init();
    renderMembers();
    $('#result').innerHTML = '<div class="panel empty">질문을 입력하고 <b>답 받아보기</b>를 눌러 주세요. 예시 버튼을 눌러도 바로 시작됩니다. 👆</div>';
  });
})();

/* 새 버전이 배포되면 알려준다. 이게 없으면 이미 설치한 사람은 낡은 화면을
   계속 보게 된다 (서비스 워커가 붙잡고 있는 페이지는 스스로 갱신되지 않는다). */
function showUpdateBanner() {
  if (document.getElementById('updateBar')) return;
  const bar = document.createElement('div');
  bar.id = 'updateBar';
  bar.className = 'updatebar';
  bar.innerHTML = '<span>✨ 새 버전이 나왔어요</span><button type="button">새로고침</button>';
  bar.querySelector('button').addEventListener('click', () => window.location.reload());
  document.body.appendChild(bar);
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").then((reg) => {
      reg.addEventListener("updatefound", () => {
        const sw = reg.installing;
        if (!sw) return;
        sw.addEventListener("statechange", () => {
          // controller 가 이미 있다 = 기존 버전을 쓰던 중에 새 버전이 깔렸다
          if (sw.state === "installed" && navigator.serviceWorker.controller) showUpdateBanner();
        });
      });
      reg.update().catch(() => {});          // 앱을 열 때마다 갱신 여부 확인
    }).catch(() => {});

    // 탭을 다시 열 때도 한 번 더 확인
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        navigator.serviceWorker.getRegistration().then((r) => r && r.update()).catch(() => {});
      }
    });
  });
}
