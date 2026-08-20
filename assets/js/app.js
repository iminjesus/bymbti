/* bymbti — UI */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const EXAMPLES = [
    '지구 온난화의 영향과 해결 방안에 대해 조사하고 발표하시오',
    '우리 학교 축제 홍보 캠페인을 기획하라',
    'AI가 일자리에 미치는 영향 — 찬반 토론 준비',
    '지역 상권 데이터를 분석해 개선 방안을 제안하는 보고서',
    '중고 물품 거래 앱 프로토타입 제작 및 시연',
    '청소년 SNS 사용 실태 설문조사 리포트',
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
    state.analysis = analyzeQuestion(q);
    state.aiCache = {};
    render();
    $('#result').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function render() {
    const a = state.analysis;
    let html = analysisSection(a) + roadmapSection(a);
    html += state.mode === 'team' ? teamSection(a) : '';
    html += typesSection(a);
    $('#result').innerHTML = html;
    bindResult();
  }

  /* ── 1. 과제 분석 ───────────────────────────────────────── */
  function analysisSection(a) {
    return `
    <h2 class="section-title">🧭 과제 분석 <small>입력한 질문을 이렇게 읽었습니다</small></h2>
    <section class="panel">
      <div class="meta-grid">
        <div class="meta"><div class="k">과제 유형</div><div class="v">${a.kindEmoji} ${esc(a.kindLabel)}</div></div>
        <div class="meta"><div class="k">핵심 주제</div><div class="v">${esc(a.topic)}</div></div>
        <div class="meta"><div class="k">답변에 들어가야 할 축</div><div class="v">${a.axes.map((x) => esc(x.label)).join(' · ')}</div></div>
        <div class="meta"><div class="k">추천 결과물</div><div class="v" style="font-size:14px">${esc(a.output)}</div></div>
      </div>
      <div class="tagline-pills">
        ${a.topTraits.length
    ? `<span class="pill">이 과제에 특히 필요한 역량</span>` + a.topTraits.map((t) => `<span class="pill">${esc(t.label)}</span>`).join('')
    : '<span class="pill">특정 역량 편중 없음 — 균형 배정</span>'}
      </div>
      ${a.keywords.length ? `<div class="tagline-pills">${a.keywords.map((k) => `<span class="pill" style="background:#232748;border-color:var(--line);color:var(--tx2)">#${esc(k)}</span>`).join('')}</div>` : ''}
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
    if (!state.members.length) {
      return `<h2 class="section-title">👥 우리 조 역할 배정</h2>
        <section class="panel empty">위에서 조원을 추가하면 겹치지 않게 역할을 나눠드립니다.<br>
        급하면 <b>🎲 랜덤 4인조</b>를 눌러 보세요.</section>`;
    }
    const { assignments, unfilled } = assignTeam(state.members, a);
    const diag = diagnoseTeam(state.members);

    return `
    <h2 class="section-title">👥 우리 조 역할 배정 <small>${state.members.length}명 · 중복 없이 최적 배치</small></h2>
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
              <div class="why">📌 ${esc(x.reason)}<br>🗒️ ${esc(x.note)}</div>
              <div class="why">😈 조별과제 빌런 포인트 — ${esc(x.type.villain)}</div>
            </div>
          </div>`).join('')}
      </div>
      ${unfilled.length ? `<div class="warnbox" style="margin-top:14px">
        ⚠️ 인원이 부족해 <b>${unfilled.map((r) => esc(r.name)).join(', ')}</b> 역할은 비어 있습니다.
        위 배정에서 여유 있는 사람이 겸임하거나, 조원을 더 추가하세요.</div>` : ''}
    </section>

    <h2 class="section-title">🔮 우리 조 케미 진단 <small>미리 알면 피할 수 있습니다</small></h2>
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
    <h2 class="section-title">🧬 MBTI별 예상 정답 &amp; 역할 <small>같은 질문, 16가지 다른 답</small></h2>
    <section class="panel">
      <div class="filters">
        ${groups.map((g) => `<button class="filter ${state.filter === g ? 'on' : ''}" data-f="${g}">${labels[g]}</button>`).join('')}
      </div>
      <div class="row" style="margin-bottom:12px">
        ${LLM.hasKey() ? '<button class="ghost" id="aiAll">✨ 보이는 유형 전부 AI로 다시 쓰기</button>' : ''}
        <button class="ghost" id="copyAll">📋 결과 텍스트 복사</button>
        <button class="ghost" onclick="window.print()">🖨️ 인쇄 / PDF 저장</button>
      </div>
      <div class="cards">${cards}</div>
    </section>`;
  }

  function typeCard(c, a) {
    const t = c.type;
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

      <div class="meme">${esc(t.meme)}
        <div class="memetags">${t.memeTags.map((m) => `<span>${esc(m)}</span>`).join('')}</div>
      </div>

      <div class="roleline">
        <div class="lab">이 과제에서 맡아야 할 역할</div>
        <div class="val">${c.primary.role.emoji} ${esc(c.primary.role.name)}</div>
        <div class="sub">${esc(c.primary.role.duty)}</div>
        <div class="sub" style="margin-top:6px;color:var(--tx3)">서브 역할 — ${c.secondary.role.emoji} ${esc(c.secondary.role.name)} · 안 맞는 역할 — ${esc(c.avoid.role.name)}</div>
      </div>

      <div class="block">
        <div class="h">💬 예상 정답</div>
        <div class="p">${esc(c.answer.body)}</div>
        <ul>${c.answer.bullets.map((b) => `<li><b>${esc(b.label)}</b> — ${esc(b.text)}</li>`).join('')}</ul>
      </div>

      <div class="block">
        <div class="h">🎙️ 회의에서 할 법한 한마디</div>
        <div class="quote">${esc(c.answer.quote)}</div>
      </div>

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

      <div class="trap">⚠️ 주의 — ${esc(t.caution)} (열등기능 ${t.stack[3]}: ${esc(c.answer.trap)})</div>
      <div class="block"><div class="h">🤝 이 과제에서 잘 맞는 짝</div>
        <div class="p" style="font-size:13.5px">${c.partner.emoji} <b>${c.partner.code}</b> — ${esc(c.partner.teamLine)}</div>
      </div>

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
    const lines = [`■ 과제: ${a.question}`, `■ 유형: ${a.kindLabel} / 결과물: ${a.output}`, ''];

    if (state.mode === 'team' && state.members.length) {
      lines.push('■ 우리 조 역할 배정');
      assignTeam(state.members, a).assignments.forEach((x) => {
        lines.push(`- ${x.member.name} (${x.type.code}) → ${x.role.name}: ${x.role.mission}`);
      });
      lines.push('');
    }

    lines.push('■ MBTI별 예상 정답 & 역할');
    assignAllTypes(a)
      .filter((x) => state.filter === 'ALL' || x.type.group === state.filter)
      .forEach((x) => {
        const c = buildTypeCard(x.type, a, x);
        lines.push(`\n[${x.type.code} · ${x.type.nickname}] 역할: ${c.primary.role.name}`);
        lines.push(`  답변: ${c.answer.body}`);
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
    $('#result').innerHTML = '<div class="panel empty">질문을 입력하고 <b>역할 배정하기</b>를 눌러 주세요. 예시 버튼을 눌러도 바로 시작됩니다. 👆</div>';
  });
})();
