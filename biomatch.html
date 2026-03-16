import { loadGameData } from './data-loader.js';

const app = document.querySelector('#app');

const gateOrder = [
  'שער הגילוי הנסתר',
  'שער הסוד הקדום',
  'שער הרמזים הנעלמים',
  'שער התמונה הנסתרת',
  'שער ההשראה החכמה',
  'שער ההמצאות',
  'שער המפתח הסופי'
];

const state = {
  data: null,
  selectedOrganism: null,
  stepIndex: 0,
  feedback: '',
  hintShown: false,
  activeDidYouKnow: '',
  lockOpened: false,
  selectedMatch: '',
  cipherSelection: [],
  gateQuestionIndex: 0,
  codeDigits: []
};

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
  לוטוס: 'lotus'
};

function resetStepState() {
  state.feedback = '';
  state.hintShown = false;
  state.activeDidYouKnow = '';
}

function escapeHTML(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function normalizeText(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function getCurrentTrack() {
  if (!state.selectedOrganism) return null;
  return state.data.getTrack(state.selectedOrganism);
}

function getCurrentGate() {
  return gateOrder[state.stepIndex];
}

function getQuestionsByGate(gate) {
  const track = getCurrentTrack();
  return track?.mcq.filter((item) => item.gate === gate) ?? [];
}

function getOrganismImage(organism) {
  const imageName = ORGANISM_IMAGES[organism];
  return imageName ? `images/${imageName}.png` : 'images/game-intro.png';
}

function renderSlideLayout({ eyebrow = '', title, subtitle = '', content, imageSrc, imageAlt, imageCaption = '' }) {
  return `
    <section class="card slide-card">
      <div class="slide-layout">
        <article class="slide-content">
          ${eyebrow ? `<p class="eyebrow">${escapeHTML(eyebrow)}</p>` : ''}
          <h2>${escapeHTML(title)}</h2>
          ${subtitle ? `<p class="subtle">${escapeHTML(subtitle)}</p>` : ''}
          ${content}
        </article>
        <aside class="slide-image-panel glow">
          <img src="${escapeHTML(imageSrc)}" alt="${escapeHTML(imageAlt)}" class="slide-image" />
          ${imageCaption ? `<p class="image-caption">${escapeHTML(imageCaption)}</p>` : ''}
        </aside>
      </div>
    </section>
  `;
}

function showStartScreen() {
  const storyContent = `
    <p class="story">${escapeHTML(state.data.config['סיפור מסגרת']).replaceAll('\n', '<br>')}</p>
    <button data-action="start" class="primary-btn">התחילו במסע</button>
  `;
  app.innerHTML = `
    <main class="screen intro-screen">
      ${renderSlideLayout({
        eyebrow: 'חדר בריחה דיגיטלי',
        title: state.data.config['שם המשחק'],
        content: storyContent,
        imageSrc: 'images/game-intro.png',
        imageAlt: 'שער קסום לעולם הביומימיקרי',
        imageCaption: 'כל רמז הוא מפתח חדש לידע של הטבע'
      })}
    </main>
  `;
}

function showDoorScreen() {
  const doors = state.data.organisms.slice(0, 5);
  app.innerHTML = `
    <main class="screen door-screen">
      <section class="card">
        <h2>בחרו שער מסתורי</h2>
        <p>כל שער יוביל אתכם למסלול גילוי שונה.</p>
        <div class="door-grid">
          ${doors
            .map(
              (organism, index) => `
              <button data-door="${escapeHTML(organism)}" class="door-btn">
                <span class="icon">${DOOR_ICONS[index % DOOR_ICONS.length]}</span>
                <span>שער ${index + 1}</span>
              </button>
          `
            )
            .join('')}
        </div>
      </section>
    </main>
  `;
}

function getMcqByGate(gate) {
  const questions = getQuestionsByGate(gate);
  return questions[state.gateQuestionIndex] ?? null;
}

function renderHintBlock(hint) {
  return state.hintShown ? `<p class="hint">💡 ${escapeHTML(hint)}</p>` : '';
}

function renderFeedback() {
  return state.feedback ? `<p class="feedback">${escapeHTML(state.feedback)}</p>` : '';
}

function showMcqGate(mcq) {
  const gate = getCurrentGate();
  const options = [mcq.optionA, mcq.optionB, mcq.optionC, mcq.optionD].filter(Boolean);
  const questionCounter = getQuestionsByGate(gate).length > 1 ? `<p class="subtle">שאלה ${state.gateQuestionIndex + 1} מתוך ${getQuestionsByGate(gate).length}</p>` : '';
  const content = `
    ${questionCounter}
    <div class="options">
      ${options
        .map(
          (option, index) => `<button class="option-btn" data-answer="${escapeHTML(option)}" data-index="${index + 1}"><span class="answer-index">${index + 1}.</span> ${escapeHTML(option)}</button>`
        )
        .join('')}
    </div>
    <div class="actions-row">
      <button class="secondary-btn" data-action="hint">קבלו רמז</button>
      <button class="ghost-btn" data-action="restart">חזרה להתחלה</button>
    </div>
    ${renderHintBlock(mcq.hint)}
    ${renderFeedback()}
  `;

  app.innerHTML = `
    <main class="screen stage-screen">
      ${renderSlideLayout({
        eyebrow: mcq.gate,
        title: mcq.question,
        content,
        imageSrc: gate === 'שער הגילוי הנסתר' ? 'images/q.png' : getOrganismImage(state.selectedOrganism),
        imageAlt: `איור של ${state.selectedOrganism}`,
        imageCaption: `מסלול ${escapeHTML(state.selectedOrganism)}`
      })}
    </main>
  `;
}

function showHabitatGate(mcq) {
  const allOptions = [mcq.optionA, mcq.optionB, mcq.optionC, mcq.optionD].filter(Boolean);
  const fallback = 'בית גידול נוסף';
  const options = shuffle([...allOptions, fallback]).slice(0, 5);
  const correctIndex = options.indexOf(mcq.correctAnswer);
  const content = `
    <p class="subtle">בחרו את תמונת בית הגידול המתאימה ליצירה שבחרתם.</p>
    <div class="habitat-grid">
      ${options
        .map(
          (option, index) => `
            <button class="habitat-card" data-answer="${escapeHTML(option)}" data-index="${index + 1}">
              <img src="images/q.png" alt="בית גידול ${index + 1}" />
              <span>${escapeHTML(option)}</span>
            </button>
          `
        )
        .join('')}
    </div>
    <input type="hidden" id="habitat-correct-index" value="${correctIndex + 1}" />
    <div class="actions-row">
      <button class="secondary-btn" data-action="hint">קבלו רמז</button>
      <button class="ghost-btn" data-action="restart">חזרה להתחלה</button>
    </div>
    ${renderHintBlock(mcq.hint)}
    ${renderFeedback()}
  `;

  app.innerHTML = `
    <main class="screen stage-screen">
      ${renderSlideLayout({
        eyebrow: mcq.gate,
        title: mcq.question,
        content,
        imageSrc: 'images/q.png',
        imageAlt: 'בחירת בית גידול',
        imageCaption: 'התמונה הנכונה היא חלק מהקוד הסופי'
      })}
    </main>
  `;
}

function buildImageTargets(count) {
  const total = Math.max(8, Number(count) + 4);
  return shuffle([
    ...Array.from({ length: Number(count) }, () => 1),
    ...Array.from({ length: total - Number(count) }, () => 0)
  ]);
}

function showImageGate(task) {
  const dots = buildImageTargets(task.correctAnswer);
  const content = `
    <p class="subtle">${escapeHTML(task.sceneDescription)}</p>
    <div class="image-puzzle">
      ${dots
        .map((isTarget, index) => `<span class="spot ${isTarget ? 'target' : ''}" title="סימון ${index + 1}"></span>`)
        .join('')}
    </div>
    <label class="answer-label" for="image-answer">כמה מצאתם?</label>
    <input id="image-answer" type="number" min="0" placeholder="כתבו מספר" />
    <div class="actions-row">
      <button class="primary-btn" data-action="submit-image">בדיקה</button>
      <button class="secondary-btn" data-action="hint">קבלו רמז</button>
    </div>
    ${renderHintBlock(task.hint)}
    ${renderFeedback()}
  `;

  app.innerHTML = `
    <main class="screen stage-screen">
      ${renderSlideLayout({
        eyebrow: task.gate,
        title: task.prompt,
        content,
        imageSrc: getOrganismImage(state.selectedOrganism),
        imageAlt: `איור של ${state.selectedOrganism}`,
        imageCaption: task.targetLabel
      })}
    </main>
  `;
}

function showMatchingGate(task) {
  const cards = shuffle([
    { organism: task.mainOrganism, invention: task.mainInvention, correct: true },
    { organism: task.otherOrganism1, invention: task.otherInvention1, correct: false },
    { organism: task.otherOrganism2, invention: task.otherInvention2, correct: false }
  ]);

  const content = `
    <div class="match-grid">
      ${cards
        .map(
          (card) => `
          <button class="match-card" data-match="${card.correct ? 'yes' : 'no'}">
            <strong>${escapeHTML(card.organism)}</strong>
            <span>${escapeHTML(card.invention)}</span>
          </button>`
        )
        .join('')}
    </div>
    <div class="actions-row">
      <button class="ghost-btn" data-action="restart">בחרו דלת מחדש</button>
    </div>
    ${renderFeedback()}
  `;

  app.innerHTML = `
    <main class="screen stage-screen">
      ${renderSlideLayout({
        eyebrow: task.gate,
        title: task.prompt,
        content,
        imageSrc: getOrganismImage(state.selectedOrganism),
        imageAlt: `איור של ${state.selectedOrganism}`,
        imageCaption: `בחרו את ההשראה של ${state.selectedOrganism}`
      })}
    </main>
  `;
}

function showCipherGate() {
  const cipher = state.data.cipher;
  const expectedCode = state.codeDigits.join('');

  const content = `
    <p class="subtle">הקלידו את הקוד שאספתם לאורך השערים הקודמים.</p>
    <input id="final-code" type="text" dir="ltr" placeholder="הקלידו קוד" class="code-input" />
    <div class="actions-row">
      <button class="primary-btn" data-action="submit-cipher">בדיקת קוד</button>
    </div>
    <p class="subtle">מסר כתב הסתרים: <strong>${escapeHTML(cipher.solution)}</strong></p>
    ${expectedCode ? `<p class="subtle">(למורה: קוד צפוי במסלול זה: ${escapeHTML(expectedCode)})</p>` : ''}
    ${state.lockOpened ? '<div class="lock-open">🔓 הצלחתם לפענח את הסוד. המנעול נפתח...</div>' : ''}
    ${renderFeedback()}
    ${state.lockOpened ? `<button class="primary-btn" data-action="next">${escapeHTML(cipher.continueLabel || 'המשיכו פנימה')}</button>` : ''}
  `;

  app.innerHTML = `
    <main class="screen stage-screen">
      ${renderSlideLayout({
        eyebrow: cipher.gate,
        title: cipher.instruction,
        content,
        imageSrc: 'images/q.png',
        imageAlt: 'סמל כתב סתרים קסום',
        imageCaption: 'הסוד מחכה בסדר המדויק'
      })}
    </main>
  `;
}

function showEndScreen() {
  app.innerHTML = `
    <main class="screen end-screen">
      <section class="card glow">
        <h2>המסע הושלם</h2>
        <p>${escapeHTML(state.data.cipher.endingMessage)}</p>
        <div class="celebration">✨🌿✨</div>
        <button class="primary-btn" data-action="restart">חזרה להתחלה</button>
      </section>
    </main>
  `;
}

function renderDidYouKnow() {
  if (!state.activeDidYouKnow) return;
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-card">
      <h3>הידעת?</h3>
      <p>${escapeHTML(state.activeDidYouKnow)}</p>
      <button class="primary-btn" data-action="close-didyouknow">המשיכו</button>
    </div>
  `;
  app.appendChild(modal);
}

function showCurrentStep() {
  const gate = getCurrentGate();
  const track = getCurrentTrack();

  if (!track) {
    showDoorScreen();
    return;
  }

  if (gate === 'שער התמונה הנסתרת') {
    showImageGate(track.imageTask);
  } else if (gate === 'שער ההמצאות') {
    showMatchingGate(track.matchingTask);
  } else if (gate === 'שער המפתח הסופי') {
    showCipherGate();
  } else if (gate === 'שער הרמזים הנעלמים') {
    showHabitatGate(getMcqByGate(gate));
  } else {
    const mcq = getMcqByGate(gate);
    showMcqGate(mcq);
  }

  renderDidYouKnow();
}

function goToNextStep() {
  state.stepIndex += 1;
  state.gateQuestionIndex = 0;
  resetStepState();
  state.cipherSelection = [];

  if (state.stepIndex >= gateOrder.length) {
    showEndScreen();
    return;
  }

  app.innerHTML = `<main class="screen transition-screen"><section class="card glow transition-card"><h2>✨ מעבר בין שערים ✨</h2><p>האנרגיה הקסומה נטענת לשלב הבא...</p></section></main>`;
  setTimeout(showCurrentStep, 450);
}

function restartToHome() {
  state.selectedOrganism = null;
  state.stepIndex = 0;
  state.lockOpened = false;
  state.cipherSelection = [];
  state.gateQuestionIndex = 0;
  state.codeDigits = [];
  resetStepState();
  showStartScreen();
}

function onAppClick(event) {
  const actionButton = event.target.closest('[data-action]');
  const answerButton = event.target.closest('[data-answer]');
  const doorButton = event.target.closest('[data-door]');
  const matchButton = event.target.closest('[data-match]');
  const wordButton = event.target.closest('[data-word]');

  if (doorButton) {
    state.selectedOrganism = doorButton.dataset.door;
    state.stepIndex = 0;
    state.lockOpened = false;
    state.cipherSelection = [];
    state.codeDigits = [];
    state.gateQuestionIndex = 0;
    resetStepState();
    showCurrentStep();
    return;
  }

  if (answerButton) {
    const gate = getCurrentGate();
    const mcq = getMcqByGate(gate);
    const selected = normalizeText(answerButton.dataset.answer);
    const correct = normalizeText(mcq.correctAnswer);
    if (selected === correct) {
      if (['שער הגילוי הנסתר', 'שער הסוד הקדום', 'שער הרמזים הנעלמים'].includes(gate)) {
        state.codeDigits.push(answerButton.dataset.index || '1');
      }
      state.feedback = 'מעולה!';
      const questionsInGate = getQuestionsByGate(gate);
      if (state.gateQuestionIndex < questionsInGate.length - 1) {
        state.gateQuestionIndex += 1;
        showCurrentStep();
        return;
      }
      if ((gate === 'שער הסוד הקדום' || gate === 'שער ההשראה החכמה') && mcq.didYouKnow) {
        state.activeDidYouKnow = mcq.didYouKnow;
      } else {
        setTimeout(goToNextStep, 500);
      }
    } else {
      state.feedback = 'נסו שוב או בדקו שוב את הרמז.';
    }
    showCurrentStep();
    return;
  }

  if (matchButton) {
    if (matchButton.dataset.match === 'yes') {
      state.feedback = 'נכון מאוד! ההתאמה הושלמה.';
      showCurrentStep();
      setTimeout(goToNextStep, 600);
    } else {
      state.feedback = 'נסו שוב. חפשו את ההשראה שמתאימה לאורגניזם הראשי.';
      showCurrentStep();
    }
    return;
  }

  if (!actionButton) return;

  const action = actionButton.dataset.action;

  if (action === 'start') {
    showDoorScreen();
  } else if (action === 'hint') {
    state.hintShown = true;
    showCurrentStep();
  } else if (action === 'restart') {
    restartToHome();
  } else if (action === 'close-didyouknow') {
    state.activeDidYouKnow = '';
    goToNextStep();
  } else if (action === 'submit-image') {
    const input = document.querySelector('#image-answer');
    const track = getCurrentTrack();
    const correct = normalizeText(track.imageTask.correctAnswer);
    if (normalizeText(input.value) === correct) {
      state.feedback = 'כל הכבוד! גיליתם את כל הרמזים.';
      showCurrentStep();
      setTimeout(goToNextStep, 600);
    } else {
      state.feedback = 'נסו שוב. בדקו את הסימנים הקטנים.';
      showCurrentStep();
    }
  } else if (action === 'submit-cipher') {
    const input = document.querySelector('#final-code');
    const correct = normalizeText(state.codeDigits.join(''));
    if (normalizeText(input.value) === correct) {
      state.lockOpened = true;
      state.feedback = '';
    } else {
      state.feedback = 'הקוד שגוי. נסו שוב לפי המספרים שאספתם בכל שער.';
    }
    showCurrentStep();
  } else if (action === 'next') {
    goToNextStep();
  }
}

async function init() {
  try {
    state.data = await loadGameData();
    showStartScreen();
  } catch (error) {
    app.innerHTML = `<main class="screen"><section class="card"><h1>אירעה שגיאה בטעינת הנתונים</h1><p>${escapeHTML(error.message)}</p></section></main>`;
  }
}

app.addEventListener('click', onAppClick);
init();
