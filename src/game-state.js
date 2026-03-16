const STORAGE_KEY = 'bioplay-state-v1';
const NAME_KEY = 'bioplay-player-name';

export const INITIAL_STATE = {
  selectedOrganism: null,
  currentStage: null,
  code_step_1: null,
  code_step_2: null,
  code_step_3: null,
  door_1_unlocked: false,
  secret_digit_1: null,
  secret_digit_2: null,
  element_count_code: null,
  door_2_unlocked: false,
  stage8_completed: false,
  cipher_solved: false,
  final_sentence_revealed: false,
  score: 0
};

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...INITIAL_STATE };
    return { ...INITIAL_STATE, ...JSON.parse(raw) };
  } catch {
    return { ...INITIAL_STATE };
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetState() {
  localStorage.removeItem(STORAGE_KEY);
  return { ...INITIAL_STATE };
}

export function loadPlayerName() {
  return localStorage.getItem(NAME_KEY) || '';
}

export function savePlayerName(name) {
  localStorage.setItem(NAME_KEY, name.trim());
}

export function clearPlayerName() {
  localStorage.removeItem(NAME_KEY);
}
