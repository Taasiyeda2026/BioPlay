import { STAGES, canEnterStage, nextStage } from './flow-router.js';
import { loadState, saveState, resetState } from './game-state.js';

function normalize(text) {
  return String(text ?? '').replace(/\s+/g, ' ').trim();
}

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

  function selectOrganism(organism) {
    commit({ ...resetState(), selectedOrganism: organism, currentStage: STAGES.IDENTIFICATION });
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
    if (normalize(answer) !== normalize(step.correctAnswer)) return { ok: false };
    if (state.currentStage === STAGES.IDENTIFICATION) commit({ code_step_1: String(answerIndex) });
    if (state.currentStage === STAGES.SECRET) commit({ code_step_2: String(answerIndex) });
    if (state.currentStage === STAGES.HABITAT) commit({ code_step_3: String(answerIndex) });
    advance();
    return { ok: true, didYouKnow: step.didYouKnow };
  }

  function unlockDoor1(entered) {
    const expected = `${state.code_step_1}${state.code_step_2}${state.code_step_3}`;
    if (normalize(entered) !== normalize(expected)) return false;
    commit({ door_1_unlocked: true });
    advance();
    return true;
  }

  function completeBiomatch(d1, d2) {
    commit({ secret_digit_1: String(d1), secret_digit_2: String(d2) });
    advance();
  }

  function answerStep6(value) {
    const step = getStep(STAGES.COUNT_ELEMENTS);
    if (!step) return false;
    if (normalize(value) !== normalize(step.correctAnswer)) return false;
    commit({ element_count_code: String(step.correctAnswer) });
    advance();
    return true;
  }

  function unlockDoor2(entered) {
    const doorCode = `${state.secret_digit_1}${state.secret_digit_2}${state.element_count_code}`;
    if (normalize(entered) !== normalize(doorCode)) return false;
    commit({ door_2_code: doorCode, door_2_unlocked: true, cipher_unlocked: true });
    advance();
    return true;
  }

  function solveCipher(answer) {
    if (normalize(answer) !== normalize(data.cipher.cipherSolution)) return false;
    commit({ cipher_solved: true, final_sentence_revealed: true });
    advance();
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
