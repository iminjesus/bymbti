/* bymbti — (선택) Claude API로 답변 고급 생성
 * 키는 브라우저 localStorage에만 저장되고 서버로 전송되지 않는다(Anthropic API 직접 호출).
 * 키 없이도 앱 전체가 규칙 기반으로 완전히 동작한다.
 */
const LLM = (() => {
  const KEY_STORE = 'bymbti.apiKey';
  const MODEL = 'claude-sonnet-5';
  const ENDPOINT = 'https://api.anthropic.com/v1/messages';

  const getKey = () => localStorage.getItem(KEY_STORE) || '';
  const setKey = (k) => (k ? localStorage.setItem(KEY_STORE, k) : localStorage.removeItem(KEY_STORE));
  const hasKey = () => !!getKey();

  function prompt(question, codes) {
    return [
      '너는 MBTI 밈에 빠삭한 한국인이다. 진지한 과제부터 저녁 메뉴 고민까지 뭐든 대답한다.',
      '아래 질문에 대해, 각 MBTI 유형이 실제로 내놓을 법한 답변을 써라.',
      '',
      `[질문] ${question}`,
      `[대상 유형] ${codes.join(', ')}`,
      '',
      '규칙:',
      '- 한국어로만 쓴다. 반말/구어체 섞인 위트 있는 톤. 인터넷 MBTI 밈 감성 살짝.',
      '- 각 유형의 인지기능 스택(주기능/부기능)에 근거해서 답변 방향을 다르게 만든다.',
      '- answer는 질문에 대한 "실제 대답"이어야 한다. 성격 묘사만 쓰지 마라.',
      '- 양자택일 질문이면 각 유형이 반드시 하나를 고르게 하라. 애매하게 넘어가지 마라.',
      '- 답이 꼭 정확할 필요는 없다. 그 유형답고 웃기면 그게 정답이다.',
      '- quote는 그 유형이 실제 대화에서 할 법한 한 줄 대사.',
      '',
      '출력은 아래 JSON 배열 형식만. 다른 말 금지.',
      '[{"code":"INTJ","summary":"한 줄 요약","answer":"3~4문장 답변","quote":"실제로 할 법한 한마디","tip":"이 유형이 이 상황에서 주의할 점 한 줄"}]',
    ].join('\n');
  }

  async function generate(question, codes) {
    const key = getKey();
    if (!key) throw new Error('API 키가 없습니다. 고급 설정에서 키를 입력하세요.');

    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt(question, codes) }],
      }),
    });

    if (!res.ok) {
      let detail = '';
      try { detail = (await res.json()).error?.message || ''; } catch (e) { /* noop */ }
      throw new Error(`Claude API 오류 (${res.status}) ${detail}`);
    }

    const data = await res.json();
    const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('응답을 JSON으로 읽지 못했습니다.');
    return JSON.parse(match[0]);
  }

  return { getKey, setKey, hasKey, generate, MODEL };
})();
