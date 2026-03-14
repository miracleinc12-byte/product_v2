// server/server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const fetch = require('node-fetch'); // npm install node-fetch@2 로 설치한 것

const app = express();
app.use(cors());
app.use(express.json());

/**
 * OpenAI Chat Completions 호출 공통 함수
 */
async function callOpenAI(messages, maxTokens = 3500) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY 가 설정되어 있지 않습니다. server/.env 파일을 확인하세요.');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',   // 안전한 기본 경량 모델
      messages,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('OpenAI API error:', errText);
    throw new Error('OpenAI API 호출 실패: ' + response.status);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * 키워드 분석: 카테고리/감정 등
 */
async function analyzeKeyword(keyword) {
  const prompt = `"${keyword}"라는 키워드를 분석해서 아래 형식의 JSON만 순수 텍스트로 출력해 주세요.

{
  "category": "정부지원금/여행/맛집/부동산/투자/기타 중 1개",
  "hookingStyle": "긴급형/호기심형/손실회피형/성공형/트렌드형 중 1개",
  "contentStructure": "신청절차형/정보제공형/비교분석형/체험후기형/가이드형 중 1개",
  "buttonStyle": "신청하기/확인하기/시작하기/예약하기/상담받기/더보기 중 1개",
  "targetEmotion": "urgency/curiosity/fomo/desire/trust 중 1개"
}`;

  const raw = await callOpenAI([{ role: 'user', content: prompt }], 800);

  try {
    const cleaned = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.warn('분석 JSON 파싱 실패, 기본값 사용:', raw);
    return {
      category: '기타',
      hookingStyle: '호기심형',
      contentStructure: '정보제공형',
      buttonStyle: '확인하기',
      targetEmotion: 'curiosity',
    };
  }
}

/**
 * 카테고리별 템플릿 설정 (프론트의 templates 객체와 동일한 그림)
 */
const CATEGORY_TEMPLATES = {
  '정부지원금': {
    buttonText: '신청하기',
    mainIcon: '💰',
    hookingText: '놓치면 후회하는 최대혜택',
    sectionsVersion1: ['혜택금액', '실제후기', '숨겨진혜택', '혜택상세'],
    sectionsVersion2: ['신청기간', 'FAQ', '신청절차', '필수서류'],
  },
  '여행': {
    buttonText: '여행계획',
    mainIcon: '✈️',
    hookingText: '지금 떠나야 하는 완벽코스',
    sectionsVersion1: ['추천명소', '여행후기', '숨은맛집', '여행꿀팁'],
    sectionsVersion2: ['여행코스', '예약방법', '준비물', '교통정보'],
  },
  '맛집': {
    buttonText: '예약하기',
    mainIcon: '🍽️',
    hookingText: '예약 필수! 인생맛집 발견',
    sectionsVersion1: ['시그니처메뉴', '방문후기', '숨은메뉴', '가격정보'],
    sectionsVersion2: ['예약방법', '메뉴정보', '위치안내', '주차정보'],
  },
  '부동산': {
    buttonText: '시세확인',
    mainIcon: '🏠',
    hookingText: '급등 예상되는 투자처 공개',
    sectionsVersion1: ['투자가치', '거래사례', '전망분석', '수익률'],
    sectionsVersion2: ['시세조회', '거래절차', '필요서류', '세금정보'],
  },
  '투자': {
    buttonText: '투자시작',
    mainIcon: '📈',
    hookingText: '수익률 폭발! 놓치면 안 될',
    sectionsVersion1: ['수익사례', '투자후기', '전문가분석', '투자전략'],
    sectionsVersion2: ['투자방법', '계좌개설', '필요절차', '위험관리'],
  },
  '기타': {
    buttonText: '확인하기',
    mainIcon: '⭐',
    hookingText: '지금 확인해야 할 핵심정보',
    sectionsVersion1: ['핵심정보', '이용후기', '추가혜택', '상세정보'],
    sectionsVersion2: ['이용방법', '신청절차', '준비사항', '주의사항'],
  },
};

/**
 * 프론트에서 주신 템플릿 그림 그대로 HTML 템플릿을 만들어주는 함수
 * version: 'version1' | 'version2'
 */
function buildDynamicTemplate({ keyword, analysisResult, tabs, tabLinks, adsenseCode, version, versionUrl }) {
  const baseCategory = analysisResult.category || '기타';
  const cfg = CATEGORY_TEMPLATES[baseCategory] || CATEGORY_TEMPLATES['기타'];

  const sections = version === 'version1' ? cfg.sectionsVersion1 : cfg.sectionsVersion2;

  const activeTabs = tabs.filter(tab => tab.trim() !== '');
  const activeTabLinks = tabLinks.map((link, index) =>
    tabs[index] && tabs[index].trim() !== '' ? (link || '#') : null
  ).filter(v => v !== null);

  const tabsHtml = activeTabs
    .map((tab, index) => {
      const href = activeTabLinks[index] || '#';
      const activeClass = index === 0 ? ' active' : '';
      return `                <li class="tab-item">
                     <a class="tab-link${activeClass}" data-tab="aros${index + 1}" href="${href}">${tab}</a>
                </li>`;
    })
    .join('\n');

  const adsHtml = adsenseCode && adsenseCode.trim()
    ? adsenseCode
    : `<div>
  <script async crossorigin="anonymous" src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-#"></script>
  <ins class="adsbygoogle" data-ad-client="ca-pub-#" data-ad-format="auto" data-ad-slot="#" data-full-width-responsive="true" style="display: block;"></ins>
  <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
</div>`;

  return `<!-- 상단 탭 -->
<div class="tab-wrapper">
    <div class="container">
        <nav class="tab-container">
            <ul class="tabs">
${tabsHtml}
            </ul>
        </nav>
    </div>
</div>

<!--1.상단 주목도 높은 메시지-->
<div class="aros-gray-card-center">
    <h3>[첫째줄 15-20글자 강력한 후킹문구]</h3>
    <h2>[둘째줄 15-20글자 강력한 후킹문구]</h2>
</div>

<!--애드센스 광고-->
${adsHtml}

<!--2.메뉴 버튼들-->
<div class=".apply-container">
    <div class="link-container">
      <a href="${versionUrl || '#'}" class="custom-link">
        <div class="button-container">
          <div class="button-content">
            <span class="button-text">${keyword} 바로 ${cfg.buttonText}</span>
            <span>→</span>
          </div>
        </div>
      </a>
    </div>
    <div class="link-container">
        <a href="${versionUrl || '#'}" class="custom-link">
            <div class="button-container">
                <div class="button-content">
                    <span class="button-text">${keyword} 조건 확인하기</span>
                    <span>→</span>
                </div>
            </div>
        </a>
    </div>
    <div class="link-container">
        <a href="${versionUrl || '#'}" class="custom-link">
            <div class="button-container">
                <div class="button-content">
                    <span class="button-text">${keyword} 혜택 알아보기</span>
                    <span>→</span>
                </div>
            </div>
        </a>
    </div>  
</div>

<!--3.첫 번째 맞춤 섹션-->
<div class="aros-gray-card" style="margin: 20px 0px;">
    <div style="align-items: center; display: flex; justify-content: space-between;">
        <div style="flex: 3 1 0%;">
            <h3>${keyword} ${sections[0]}</h3>
            <p class=".apply-date-text">${cfg.hookingText}</p>
            <p class=".apply-text">[${sections[0]}와 관련된 중요 포인트]</p>
        </div>
        <div style="flex: 1 1 0%; text-align: right;">
            <div style="font-size: 40px;">${cfg.mainIcon}</div>
        </div>
    </div>
</div>

<!--4.두 번째 맞춤 섹션-->
<div class="aros-gray-card" style="margin: 20px 0px;">
    <h3>${keyword} ${sections[1]}</h3>
    <div class="highlight-box requirements">
        <div class="requirement-item">
            <p class="requirement-title">1. [${sections[1]} 포인트1]</p>
            <p class="requirement-desc">• [구체적이고 실용적인 ${sections[1]} 정보1]</p>
        </div>
        <div class="requirement-item">
            <p class="requirement-title">2. [${sections[1]} 포인트2]</p>
            <p class="requirement-desc">• [구체적이고 실용적인 ${sections[1]} 정보2]</p>
        </div>
        <div class="requirement-item">
            <p class="requirement-title">3. [${sections[1]} 포인트3]</p>
            <p class="requirement-desc">• [구체적이고 실용적인 ${sections[1]} 정보3]</p>
        </div>
    </div>
</div>

<!--5.세 번째 맞춤 섹션-->
<div class="aros-gray-card" style="margin: 20px 0px;">
    <h3>${keyword} ${sections[2]}</h3>
    <div class="highlight-box requirements">
        <div class="requirement-item">
            <p class="requirement-title">${sections[2]} 1</p>
            <p class="requirement-desc">"[${sections[2]}와 관련된 구체적 사례나 정보1]"</p>
        </div>
        <div class="requirement-item">
            <p class="requirement-title">${sections[2]} 2</p>
            <p class="requirement-desc">"[${sections[2]}와 관련된 구체적 사례나 정보2]"</p>
        </div>
        <div class="requirement-item">
            <p class="requirement-title">${sections[2]} 3</p>
            <p class="requirement-desc">"[${sections[2]}와 관련된 구체적 사례나 정보3]"</p>
        </div>
    </div>
</div>

<!--6.상품 설명-->
<div class="aros-gray-card">
   <h3>${keyword}에 대한 ${sections[3]} 안내</h3>
   <p class="description">[${keyword}의 ${sections[3]} 관련 상세 설명]</p>
   
   <div class="highlight-box requirements">
       <div class="requirement-item">
           <p class="requirement-title">1. [${sections[3]} 요소1]</p>
           <p class="requirement-desc">• [${sections[3]}의 세부 정보1]</p>
       </div>
       <div class="requirement-item">
           <p class="requirement-title">2. [${sections[3]} 요소2]</p>
           <p class="requirement-desc">• [${sections[3]}의 세부 정보2]</p>
       </div>
       <div class="requirement-item">
           <p class="requirement-title">3. [${sections[3]} 요소3]</p>
           <p class="requirement-desc">• [${sections[3]}의 세부 정보3]</p>
       </div>
   </div>
</div>

<!--7. 함께보면 좋은 글-->
<div class="aros-gray-card benefit-card">
    <h3 class="benefit-title">
        ${keyword} 관련 필수 정보
    </h3>
    
    <div class="benefit-list">
        <a href="${versionUrl || '#'}">
            <div class="benefit-item">
                <span class="benefit-text">• [${keyword} 관련 핵심 정보1]</span>
                <span>→</span>
            </div>
        </a>
        <a href="${versionUrl || '#'}">
            <div class="benefit-item">
                <span class="benefit-text">• [${keyword} 관련 핵심 정보2]</span>
                <span>→</span>
            </div>
        </a>
        <a href="${versionUrl || '#'}">
            <div class="benefit-item">
                <span class="benefit-text">• [${keyword} 관련 핵심 정보3]</span>
                <span>→</span>
            </div>
        </a>
    </div>

    <a href="${versionUrl || '#'}">
        <button class="bottom-button">
            <span>${keyword} 자세히 알아보기</span>
            <span>→</span>
        </button>
    </a>
</div>`;
}

/**
 * 최종 프롬프트 생성:
 * - 위 템플릿의 [대괄호] 부분만 자연스럽게 채우도록 지시
 */
function buildHtmlPrompt({ keyword, analysisResult, tabs, tabLinks, adsenseCode, version, versionUrl }) {
  const templateHtml = buildDynamicTemplate({
    keyword,
    analysisResult,
    tabs,
    tabLinks,
    adsenseCode,
    version,
    versionUrl,
  });

  const styleText =
    version === 'version1'
      ? '혜택/감정 중심 랜딩 페이지 스타일로, 받는 혜택과 장점을 강조.'
      : '신청 절차/실용 정보 중심 랜딩 페이지 스타일로, 단계별 과정과 준비사항을 구체적으로 설명.';

  const prompt = `"${keyword}" 주제의 홈페이지형 블로그 스킨 HTML을 작성합니다.

분석 정보:
${JSON.stringify(analysisResult, null, 2)}

스타일:
- ${styleText}
- 후킹 문구 2줄(각 15~20자)로 ${analysisResult.targetEmotion || 'curiosity'} 감정을 자극
- 구체적 금액/기간 등은 현재 기준으로 자연스럽게, 하지만 특정 연도/날짜(예: 2023년, 5월 10일 등)는 피하고 "현재", "최근", "올해" 정도로 표현
- 전체 HTML 구조(태그, class, div 순서)는 그대로 유지

다음 템플릿에서 [대괄호] 부분만 자연스럽고 구체적인 한국어 문장으로 채워 넣으세요.
템플릿 전체를 그대로 출력해야 하며, HTML 코드만 출력합니다.

템플릿:
${templateHtml}
`;

  return prompt;
}

/**
 * 메인 API: /api/generate-html
 * 프론트에서 version: 'version1' | 'version2' 로 넘겨주도록 설계
 */
app.post('/api/generate-html', async (req, res) => {
  try {
    const {
      password,
      keyword,
      tabs,
      tabLinks,
      adsenseCode,
      version,    // 'version1' | 'version2'
      versionUrl, // 버튼 링크 URL
    } = req.body;

    // 비밀번호 검증
    if (process.env.ACCESS_PASSWORD && password !== process.env.ACCESS_PASSWORD) {
      return res.status(401).json({ error: 'INVALID_PASSWORD' });
    }

    if (!keyword || !Array.isArray(tabs) || tabs.filter(t => t.trim()).length === 0) {
      return res.status(400).json({ error: 'keyword와 최소 1개 탭이 필요합니다.' });
    }

    const analysisResult = await analyzeKeyword(keyword);
    const htmlPrompt = buildHtmlPrompt({
      keyword,
      analysisResult,
      tabs,
      tabLinks: Array.isArray(tabLinks) ? tabLinks : [],
      adsenseCode: adsenseCode || '',
      version: version === 'version1' ? 'version1' : 'version2',
      versionUrl: versionUrl || '#',
    });

    const html = await callOpenAI([{ role: 'user', content: htmlPrompt }], 4000);

    res.json({ html });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'SERVER_ERROR', detail: err.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Landing generator server listening on port ${PORT}`);
});
