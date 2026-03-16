import { loadGameData } from './data-loader.js';
import { createGameEngine } from './game-engine.js';
import { STAGES } from './flow-router.js';

const app = document.querySelector('#app');
let data;
let engine;
let feedback = '';

function esc(v) {
  return String(v ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function render() {
  const state = engine.getState();
  if (!state.selectedOrganism) {
    app.innerHTML = `
      <main class="screen"><section class="card"><h1>${esc(data.config.gameName)}</h1><p class="story">${esc(data.config.story).replaceAll('\n', '<br>')}</p>
      <div class="door-grid">${data.organisms.map((o) => `<button class="door-btn" data-organism="${esc(o)}">${esc(o)}</button>`).join('')}</div></section></main>`;
    return;
  }

  const stage = engine.getCurrentStage();
  const step = engine.getStep();
  const bundle = engine.getBundle();

  if ([STAGES.IDENTIFICATION, STAGES.SECRET, STAGES.HABITAT].includes(stage)) {
    app.innerHTML = `<main class="screen"><section class="card"><p class="eyebrow">${esc(step.gateName)}</p><h2>${esc(step.question)}</h2>
      <div class="options">${step.options.map((o, i) => `<button class="option-btn" data-answer="${esc(o)}" data-index="${i + 1}">${i + 1}. ${esc(o)}</button>`).join('')}</div>
      <button class="secondary-btn" data-action="hint">רמז</button>
      ${feedback ? `<p class="feedback">${esc(feedback)}</p>` : ''}
      ${feedback === 'hint' ? `<p class="hint">${esc(step.hint)}</p>` : ''}
      </section></main>`;
    return;
  }

  if (stage === STAGES.DOOR_1) {
    app.innerHTML = `<main class="screen"><section class="card"><h2>דלת פתיחה ראשונה</h2><input id="door1" class="code-input" placeholder="___" /><button class="primary-btn" data-action="door1">פתיחה</button>${feedback ? `<p class="feedback">${esc(feedback)}</p>` : ''}</section></main>`;
    return;
  }

  if (stage === STAGES.BIOMATCH) {
    app.innerHTML = `<main class="screen"><section class="card"><h2>biomatch</h2><p>${esc(bundle.matching.instruction)}</p><iframe class="biomatch-frame" src="biomatch.html?organism=${encodeURIComponent(state.selectedOrganism)}" style="width:100%;height:620px;border:0"></iframe>${feedback ? `<p class="feedback">${esc(feedback)}</p>` : ''}</section></main>`;
    return;
  }

  if (stage === STAGES.COUNT_ELEMENTS) {
    const s = bundle.stages.step6;
    app.innerHTML = `<main class="screen"><section class="card"><p class="eyebrow">${esc(s.gateName)}</p><h2>${esc(s.instruction)}</h2><p>${esc(s.imageTopic)}</p><p>${esc(s.findWhat)}</p><input id="step6" type="number" /><button class="primary-btn" data-action="step6">בדיקה</button><button class="secondary-btn" data-action="hint">רמז</button>${feedback ? `<p class="feedback">${esc(feedback)}</p>` : ''}${feedback === 'hint' ? `<p class="hint">${esc(s.hint1)}<br>${esc(s.hint2)}</p>` : ''}</section></main>`;
    return;
  }

  if (stage === STAGES.DOOR_2) {
    app.innerHTML = `<main class="screen"><section class="card"><h2>דלת פתיחה שנייה</h2><input id="door2" class="code-input" /><button class="primary-btn" data-action="door2">פתיחה</button>${feedback ? `<p class="feedback">${esc(feedback)}</p>` : ''}</section></main>`;
    return;
  }

  if (stage === STAGES.CIPHER) {
    app.innerHTML = `<main class="screen"><section class="card"><p class="eyebrow">${esc(data.cipher.gateName)}</p><h2>${esc(data.cipher.instruction)}</h2><input id="cipher" /><button class="primary-btn" data-action="cipher">פענוח</button>${feedback ? `<p class="feedback">${esc(feedback)}</p>` : ''}</section></main>`;
    return;
  }

  app.innerHTML = `<main class="screen"><section class="card"><h2>${esc(data.cipher.finalScreenText)}</h2><button class="primary-btn" data-action="restart">${esc(data.cipher.continueButtonLabel)}</button></section></main>`;
}

app.addEventListener('click', (event) => {
  const btn = event.target.closest('button');
  if (!btn) return;
  feedback = '';

  if (btn.dataset.organism) {
    engine.selectOrganism(btn.dataset.organism);
    render();
    return;
  }

  if (btn.dataset.answer) {
    const result = engine.answerMcq(btn.dataset.answer, btn.dataset.index);
    feedback = result.ok ? (result.didYouKnow || '') : 'תשובה שגויה';
    render();
    return;
  }

  if (btn.dataset.action === 'hint') {
    feedback = 'hint';
    render();
    return;
  }

  if (btn.dataset.action === 'door1') {
    feedback = engine.unlockDoor1(document.querySelector('#door1')?.value || '') ? '' : 'קוד שגוי';
    render();
    return;
  }

  if (btn.dataset.action === 'step6') {
    feedback = engine.answerStep6(document.querySelector('#step6')?.value || '') ? '' : 'תשובה שגויה';
    render();
    return;
  }

  if (btn.dataset.action === 'door2') {
    feedback = engine.unlockDoor2(document.querySelector('#door2')?.value || '') ? '' : 'קוד שגוי';
    render();
    return;
  }

  if (btn.dataset.action === 'cipher') {
    feedback = engine.solveCipher(document.querySelector('#cipher')?.value || '') ? '' : 'פענוח שגוי';
    render();
    return;
  }

  if (btn.dataset.action === 'restart') {
    engine.restart();
    render();
  }
});

window.addEventListener('message', (event) => {
  if (event.data?.type !== 'BIOMATCH_COMPLETED') return;
  engine.completeBiomatch(event.data.secret_digit_1, event.data.secret_digit_2);
  feedback = '';
  render();
});

(async () => {
  data = await loadGameData();
  engine = createGameEngine(data);
  render();
})();
