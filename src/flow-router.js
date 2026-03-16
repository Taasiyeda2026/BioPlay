export const STAGES = {
  IDENTIFICATION: 'IDENTIFICATION',
  SECRET: 'SECRET',
  HABITAT: 'HABITAT',
  DOOR_1: 'DOOR_1',
  BIOMATCH: 'BIOMATCH',
  COUNT_ELEMENTS: 'COUNT_ELEMENTS',
  DOOR_2: 'DOOR_2',
  CIPHER: 'CIPHER',
  FINAL_SCREEN: 'FINAL_SCREEN'
};

export const FLOW_ORDER = [
  STAGES.IDENTIFICATION,
  STAGES.SECRET,
  STAGES.HABITAT,
  STAGES.DOOR_1,
  STAGES.BIOMATCH,
  STAGES.COUNT_ELEMENTS,
  STAGES.DOOR_2,
  STAGES.CIPHER,
  STAGES.FINAL_SCREEN
];

export function canEnterStage(stage, state) {
  const g = state;
  if (stage === STAGES.IDENTIFICATION) return !!g.selectedOrganism;
  if (stage === STAGES.SECRET) return !!g.code_step_1;
  if (stage === STAGES.HABITAT) return !!g.code_step_2;
  if (stage === STAGES.DOOR_1) return !!(g.code_step_1 && g.code_step_2 && g.code_step_3);
  if (stage === STAGES.BIOMATCH) return g.door_1_unlocked === true;
  if (stage === STAGES.COUNT_ELEMENTS) return g.secret_digit_1 !== null && g.secret_digit_2 !== null;
  if (stage === STAGES.DOOR_2) return g.secret_digit_1 !== null && g.secret_digit_2 !== null && g.element_count_code !== null;
  if (stage === STAGES.CIPHER) return g.door_2_unlocked === true;
  if (stage === STAGES.FINAL_SCREEN) return g.stage8_completed === true;
  return false;
}

export function nextStage(currentStage) {
  const index = FLOW_ORDER.indexOf(currentStage);
  return index === -1 ? FLOW_ORDER[0] : FLOW_ORDER[index + 1] || FLOW_ORDER[FLOW_ORDER.length - 1];
}
