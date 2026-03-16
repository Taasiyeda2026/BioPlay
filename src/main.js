import { loadGameData } from './data-loader.js';
import { createGameEngine } from './game-engine.js';
import { STAGES } from './flow-router.js';
import { loadPlayerName, savePlayerName } from './game-state.js';

const app = document.querySelector('#app');
let data;
let engine;
let feedback = '';
let hintShown = false;
let playerName = '';

const DOOR_ICONS = ['✦', '✧', '⬟', '◈', '✺'];

const ORGANISM_IMAGES = {
  שממית: 'gecko',
  עטלף: 'bat',
  ינשוף: 'owl',
  דבורה: 'honeybee',
  שפירית: 'dragonfly',
  גחלילית: 'firefly',
  זבוב: 'fly',
  יתוש: 'mosquito',
  'פרפר מורפו': 'morpho',
  נחש: 'snake',
  דיונון: 'squid',
  'דג קופסה': 'boxfish',
  כריש: 'shark',
  לווייתן: 'whale',
  פינגווין: 'penguin',
  היפופוטם: 'hippo',
  פיל: 'elephant',
  קרנף: 'rhino',
  "ג'ירפה": 'giraffe',
  "ברדלס (צ'יטה)": 'cheetah',
  בז: 'falcon',
  נשר: 'eagle',
  נקר: 'woodpecker',
  שלדג: 'kingfisher',
  'סנאי דואה': 'flying_squirrel',
  טרמיטים: 'termites',
  עכביש: 'spider',
  ברקן: 'burdock',
  דוריאן: 'durian',
  'פרח הלוטוס': 'lotus'
};

function getOrganismImage(organism) {
  const imageName = ORGANISM_IMAGES[organism];
  return imageName ? `images/${imageName}.png` : 'images/game-intro.png';
}

function esc(v) {
  return String(v ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function renderScoreBadge() {
  if (!playerName) return '';
  const score = engine ? (engine.getState().score ?? 0) : 0;
  const color = score >= 0 ? 'var(--accent-2)' : 'var(--danger)';
  return `<div class="score-badge" style="color:${color}">👤 ${esc(playerName)} &nbsp;|&nbsp; ניקוד: <strong>${score > 0 ? '+' : ''}${score}</strong></div>`;
}

function renderSlideLayout({ eyebrow = '', title, content, imageSrc, imageAlt, imageCaption = '' }) {
  return `
    <section class="card slide-card">
      <div class="slide-layout">
        <article class="slide-content">
          ${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ''}
          <h2>${esc(title)}</h2>
          ${content}
        </article>
        <aside class="slide-image-panel glow">
          <img src="${esc(imageSrc)}" alt="${esc(imageAlt)}" class="slide-image" />
          ${imageCaption ? `<p class="image-caption">${esc(imageCaption)}</p>` : ''}
        </aside>
      </div>
    </section>`;
}

function getStageLabel(stage) {
  const labels = {
    [STAGES.IDENTIFICATION]: 'שלב 1 – זיהוי',
    [STAGES.SECRET]: 'שלב 2 – סוד',
    [STAGES.HABITAT]: 'שלב 3 – בית גידול',
    [STAGES.DOOR_1]: 'שלב 4 – דלת 1',
    [STAGES.BIOMATCH]: 'שלב 5 – שאלה',
    [STAGES.COUNT_ELEMENTS]: 'שלב 6 – שאלה',
    [STAGES.DOOR_2]: 'שלב 7 – דלת 2',
    [STAGES.CIPHER]: 'שלב 8 – שאלה',
    [STAGES.FINAL_SCREEN]: 'שלב 9 – כתב סתרים'
  };
  return labels[stage] || '';
}

function createStageMcq(stage, step, bundle) {
  if (stage === STAGES.BIOMATCH) {
    const { matching } = bundle;
    if (!matching) return null;
    const options = [matching.pair1, matching.pair2, matching.pair3]
      .filter(Boolean)
      .map((pair) => `${pair.organism} ← ${pair.invention}`);
    return {
      gateName: 'שער ההמצאות',
      question: matching.instruction,
      options,
      hint: `חפשו את ההתאמה שמתחילה ב-${matching.mainOrganism}.`,
      correctAnswer: matching.mainCorrectMatch,
      didYouKnow: `שתי ספרות הסוד לשלב הבא: ${matching.secretDigits?.join('') || ''}`
    };
  }

  if (stage === STAGES.COUNT_ELEMENTS) {
    const s = step;
    if (!s) return null;
    const correct = Number.parseInt(s.correctAnswer, 10);
    const options = Array.from(new Set([
      String(correct - 2),
      String(correct - 1),
      String(correct),
      String(correct + 1)
    ].filter((v) => Number.isFinite(Number(v)) && Number(v) > 0)));

    while (options.length < 4) options.push(String(options.length + correct + 1));

    return {
      gateName: s.gateName,
      question: `${s.instruction}\nמצאו: ${s.findWhat}`,
      options,
      hint: `${s.hint1} ${s.hint2}`,
      correctAnswer: s.correctAnswer,
      didYouKnow: ''
    };
  }

  return step;
}

function renderNameScreen() {
  app.innerHTML = `
    <main class="screen door-screen">
      <section class="card" style="max-width:480px; margin:auto; text-align:center">
        <h1 style="font-size:1.6rem; margin-bottom:0.4rem">ברוכים הבאים!</h1>
        <p style="color:var(--muted); margin-bottom:1.4rem">הכניסו את שמכם כדי להתחיל את המשחק</p>
        <input
          id="player-name-input"
          class="code-input"
          placeholder="שם מלא"
          style="font-size:1.1rem; text-align:center; width:100%; margin-bottom:1rem"
          maxlength="40"
          dir="rtl"
          autofocus
        />
        <button class="primary-btn" data-action="set-name" style="width:100%">התחלה →</button>
      </section>
    </main>`;

  document.querySelector('#player-name-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitName();
  });
}

function submitName() {
  const val = document.querySelector('#player-name-input')?.value?.trim() || '';
  if (!val) {
    const input = document.querySelector('#player-name-input');
    if (input) {
      input.style.borderColor = 'var(--danger)';
      input.placeholder = 'נא להכניס שם';
    }
    return;
  }
  playerName = val;
  savePlayerName(val);
  render();
}

function render() {
  if (!playerName) {
    renderNameScreen();
    return;
  }

  const state = engine.getState();
  const scoreBadge = renderScoreBadge();

  if (!state.selectedOrganism) {
    app.innerHTML = `
      ${scoreBadge}
      <main class="screen door-screen">
        <section class="card">
          <h1>${esc(data.config.gameName)}</h1>
          <p class="story">${esc(data.config.story).replaceAll('\n', '<br>')}</p>
          <h3>בחרו שער כדי להתחיל:</h3>
          <div class="door-grid">
            ${data.organisms.map((o, i) => `<button class="door-btn" data-organism="${esc(o)}"><span class="icon">${DOOR_ICONS[i % DOOR_ICONS.length]}</span><span>${esc(o)}</span></button>`).join('')}
          </div>
        </section>
      </main>`;
    return;
  }

  const stage = engine.getCurrentStage();
  const step = engine.getStep();
  const bundle = engine.getBundle();
  const stageLabel = getStageLabel(stage);

  if ([STAGES.IDENTIFICATION, STAGES.SECRET, STAGES.HABITAT, STAGES.BIOMATCH, STAGES.COUNT_ELEMENTS, STAGES.CIPHER].includes(stage)) {
    const mcqStep = createStageMcq(stage, step, bundle);
    if (!mcqStep) return;
    const content = `
      <div class="options">${mcqStep.options.map((o, i) => `<button class="option-btn" data-answer="${esc(o)}" data-index="${i + 1}">${i + 1}. ${esc(o)}</button>`).join('')}</div>
      <div class="actions-row">
        <button class="secondary-btn" data-action="hint">רמז</button>
        <button class="ghost-btn" data-action="restart">חזרה להתחלה</button>
      </div>
      ${feedback ? `<p class="feedback">${esc(feedback)}</p>` : ''}
      ${hintShown ? `<p class="hint">💡 ${esc(mcqStep.hint)}</p>` : ''}`;

    app.innerHTML = `${scoreBadge}<main class="screen stage-screen">${renderSlideLayout({ eyebrow: `${esc(stageLabel)} · ${mcqStep.gateName}`, title: mcqStep.question, content, imageSrc: getOrganismImage(state.selectedOrganism), imageAlt: state.selectedOrganism, imageCaption: `מסלול ${state.selectedOrganism}` })}</main>`;
    return;
  }

  if (stage === STAGES.DOOR_1) {
    const content = `<p class="subtle">הזינו את שלוש הספרות מהשלבים הקודמים.</p><input id="door1" class="code-input" placeholder="___" /><div class="actions-row"><button class="primary-btn" data-action="door1">בדיקת קוד</button><button class="ghost-btn" data-action="restart">חזרה להתחלה</button></div>${feedback ? `<p class="feedback">${esc(feedback)}</p>` : ''}`;
    app.innerHTML = `${scoreBadge}<main class="screen">${renderSlideLayout({ eyebrow: stageLabel, title: 'דלת הקוד הראשונה', content, imageSrc: 'images/door1.png', imageAlt: 'דלת 1' })}</main>`;
    return;
  }

  if (stage === STAGES.DOOR_2) {
    const content = `<p class="subtle">הקוד מורכב מ-2 ספרות משלב 5 + תשובת שלב 6.</p><input id="door2" class="code-input" /><div class="actions-row"><button class="primary-btn" data-action="door2">בדיקת קוד</button></div>${feedback ? `<p class="feedback">${esc(feedback)}</p>` : ''}`;
    app.innerHTML = `${scoreBadge}<main class="screen">${renderSlideLayout({ eyebrow: stageLabel, title: 'דלת הקוד השנייה', content, imageSrc: 'images/door2.png', imageAlt: 'דלת 2' })}</main>`;
    return;
  }

  if (stage === STAGES.FINAL_SCREEN) {
    if (state.cipher_solved) {
      app.innerHTML = `${scoreBadge}<main class="screen end-screen"><section class="card glow"><p class="eyebrow">${esc(stageLabel)}</p><h2>${esc(data.cipher.finalScreenText)}</h2><p style="font-size:1.3rem; margin:1rem 0">ניקוד סופי: <strong style="color:var(--accent-2)">${state.score ?? 0}</strong></p><button class="primary-btn" data-action="restart">${esc(data.cipher.continueButtonLabel)}</button></section></main>`;
      return;
    }

    const content = `<p>${esc(data.cipher.instruction)}</p><input id="cipher" /><div class="actions-row"><button class="primary-btn" data-action="cipher">פענוח</button></div>${feedback ? `<p class="feedback">${esc(feedback)}</p>` : ''}`;
    app.innerHTML = `${scoreBadge}<main class="screen">${renderSlideLayout({ eyebrow: stageLabel, title: 'כתב סתרים', content, imageSrc: 'images/q.png', imageAlt: 'כתב סתרים' })}</main>`;
    return;
  }

  app.innerHTML = `${scoreBadge}<main class="screen end-screen"><section class="card glow"><p class="eyebrow">${esc(stageLabel)}</p><h2>${esc(data.cipher.finalScreenText)}</h2><p style="font-size:1.3rem; margin:1rem 0">ניקוד סופי: <strong style="color:var(--accent-2)">${engine.getState().score ?? 0}</strong></p><button class="primary-btn" data-action="restart">${esc(data.cipher.continueButtonLabel)}</button></section></main>`;
}

app.addEventListener('click', (event) => {
  const btn = event.target.closest('button');
  if (!btn) return;

  if (btn.dataset.action === 'set-name') {
    submitName();
    return;
  }

  feedback = '';

  if (btn.dataset.organism) {
    hintShown = false;
    engine.selectOrganism(btn.dataset.organism);
    render();
    return;
  }

  if (btn.dataset.answer) {
    let result;
    const stage = engine.getCurrentStage();
    if (stage === STAGES.BIOMATCH) {
      const matching = engine.getBundle()?.matching;
      const isCorrect = matching && btn.dataset.answer === matching.mainCorrectMatch;
      if (!isCorrect) {
        engine.completeBiomatchWrong();
        result = { ok: false, didYouKnow: '' };
      } else {
        const digits = matching?.secretDigits || [];
        const ok = engine.completeBiomatch(digits[0], digits[1]);
        result = { ok, didYouKnow: isCorrect ? `שתי ספרות הסוד: ${digits.join('')}` : '' };
      }
    } else if (stage === STAGES.COUNT_ELEMENTS) {
      const ok = engine.answerStep6(btn.dataset.answer);
      result = { ok, didYouKnow: '' };
    } else {
      result = engine.answerMcq(btn.dataset.answer, btn.dataset.index);
    }
    hintShown = false;
    feedback = result.ok ? (result.didYouKnow || 'תשובה נכונה! ממשיכים.') : 'תשובה שגויה (−10 נקודות)';
    render();
    return;
  }

  if (btn.dataset.action === 'hint') {
    hintShown = true;
    render();
    return;
  }

  if (btn.dataset.action === 'door1') {
    hintShown = false;
    const ok = engine.unlockDoor1(document.querySelector('#door1')?.value || '');
    feedback = ok ? 'הדלת נפתחה!' : 'קוד שגוי, נסו שוב (−10 נקודות)';
    render();
    return;
  }

  if (btn.dataset.action === 'door2') {
    hintShown = false;
    const ok = engine.unlockDoor2(document.querySelector('#door2')?.value || '');
    feedback = ok ? 'הדלת נפתחה!' : 'קוד שגוי, נסו שוב (−10 נקודות)';
    render();
    return;
  }

  if (btn.dataset.action === 'cipher') {
    hintShown = false;
    const ok = engine.solveCipher(document.querySelector('#cipher')?.value || '');
    feedback = ok ? '' : 'פענוח שגוי (−10 נקודות)';
    render();
    return;
  }

  if (btn.dataset.action === 'restart') {
    hintShown = false;
    engine.restart();
    render();
  }
});


(async () => {
  data = await loadGameData();
  engine = createGameEngine(data);
  playerName = loadPlayerName();
  render();
})();
