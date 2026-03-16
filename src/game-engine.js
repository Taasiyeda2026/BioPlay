import { STAGES, canEnterStage, nextStage } from './flow-router.js';
import { loadState, saveState, resetState } from './game-state.js';

function normalize(text) {
  return String(text ?? '').replace(/\s+/g, ' ').trim();
}

const STAGE8_QUESTION = {
  gateName: 'שער המעבר האחרון',
  question: 'איזה שלב מגיע מיד אחרי שלב שאלה מספר 8?',
  options: ['קוד דלת נוסף', 'כתב סתרים', 'בחירת אורגניזם מחדש', 'סיום מיידי'],
  correctAnswer: 'כתב סתרים',
  hint: 'זהו שלב 9 בזרימה המחייבת.',
  didYouKnow: ''
};

export function createGameEngine(data) {
  let state = loadState();

  const ensureStage = () => {
    if (!state.selectedOrganism) return null;
    if (!state.currentStage) return STAGES.IDENTIFICATION;
    if (canEnterStage(state.currentStage, state)) return state.currentStage;
    return STAGES.IDENTIFICATION;
  };

  function commit(partial) {
    state = { ...state, ...partial };
    saveState(state);
    return state;
  }

  function addScore(delta) {
    const current = typeof state.score === 'number' ? state.score : 0;
    commit({ score: current + delta });
  }

  function selectOrganism(organism) {
    const currentScore = typeof state.score === 'number' ? state.score : 0;
    commit({ ...resetState(), selectedOrganism: organism, currentStage: STAGES.IDENTIFICATION, score: currentScore });
    saveState(state);
  }

  function getBundle() {
    return data.getOrganismBundle(state.selectedOrganism);
  }

  function getStep(stage = state.currentStage) {
    const stages = getBundle()?.stages;
    if (!stages) return null;
    if (stage === STAGES.IDENTIFICATION) return stages.step1;
    if (stage === STAGES.SECRET) return stages.step2;
    if (stage === STAGES.HABITAT) return stages.step3;
    if (stage === STAGES.COUNT_ELEMENTS) return stages.step6;
    if (stage === STAGES.CIPHER) return STAGE8_QUESTION;
    return null;
  }

  function advance() {
    const target = nextStage(state.currentStage);
    if (!canEnterStage(target, state)) return false;
    commit({ currentStage: target });
    return true;
  }

  function answerMcq(answer, answerIndex) {
    const step = getStep();
    if (!step) return { ok: false };
    if (normalize(answer) !== normalize(step.correctAnswer)) {
      addScore(-10);
      return { ok: false };
    }
    addScore(10);
    if (state.currentStage === STAGES.IDENTIFICATION) commit({ code_step_1: String(answerIndex) });
    if (state.currentStage === STAGES.SECRET) commit({ code_step_2: String(answerIndex) });
    if (state.currentStage === STAGES.HABITAT) commit({ code_step_3: String(answerIndex) });
    if (state.currentStage === STAGES.CIPHER) commit({ stage8_completed: true });
    advance();
    return { ok: true, didYouKnow: step.didYouKnow };
  }

  function unlockDoor1(entered) {
    if (state.currentStage !== STAGES.DOOR_1) return false;
    if (!(state.code_step_1 && state.code_step_2 && state.code_step_3)) return false;
    const expected = `${state.code_step_1}${state.code_step_2}${state.code_step_3}`;
    if (normalize(entered) !== normalize(expected)) {
      addScore(-10);
      return false;
    }
    addScore(10);
    commit({ door_1_unlocked: true });
    advance();
    return true;
  }

  function completeBiomatch(d1, d2) {
    if (state.currentStage !== STAGES.BIOMATCH) return false;
    if (d1 == null || d2 == null || String(d1).trim() === '' || String(d2).trim() === '') return false;
    commit({ secret_digit_1: String(d1), secret_digit_2: String(d2) });
    advance();
    return true;
  }

  function completeBiomatchWrong() {
    addScore(-10);
  }

  function answerStep6(value) {
    if (state.currentStage !== STAGES.COUNT_ELEMENTS) return false;
    const step = getStep(STAGES.COUNT_ELEMENTS);
    if (!step) return false;
    if (normalize(value) !== normalize(step.correctAnswer)) {
      addScore(-10);
      return false;
    }
    addScore(10);
    commit({ element_count_code: String(step.correctAnswer) });
    advance();
    return true;
  }

  function unlockDoor2(entered) {
    if (state.currentStage !== STAGES.DOOR_2) return false;
    if (state.secret_digit_1 === null || state.secret_digit_2 === null || state.element_count_code === null) return false;
    const doorCode = `${state.secret_digit_1}${state.secret_digit_2}${state.element_count_code}`;
    if (normalize(entered) !== normalize(doorCode)) {
      addScore(-10);
      return false;
    }
    addScore(10);
    commit({ door_2_unlocked: true });
    advance();
    return true;
  }

  function solveCipher(answer) {
    if (state.currentStage !== STAGES.FINAL_SCREEN) return false;
    if (normalize(answer) !== normalize(data.cipher.cipherSolution)) {
      addScore(-10);
      return false;
    }
    addScore(10);
    commit({ cipher_solved: true, final_sentence_revealed: true });
    return true;
  }

  return {
    getState: () => state,
    getCurrentStage: () => ensureStage(),
    getStep,
    getBundle,
    selectOrganism,
    answerMcq,
    unlockDoor1,
    completeBiomatch,
    completeBiomatchWrong,
    answerStep6,
    unlockDoor2,
    solveCipher,
    restart() {
      state = resetState();
      saveState(state);
      return state;
    }
  };
}
