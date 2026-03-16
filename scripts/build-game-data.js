const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');

const FLOW = {
  step1: 'שער הגילוי הנסתר',
  step2: 'שער הסוד הקדום',
  step3: 'שער הרמזים הנעלמים',
  step6: 'שער התמונה הנסתרת'
};

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));
}

function writeJson(file, payload) {
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(payload, null, 2), 'utf8');
}

function runExtractor() {
  execFileSync('python', [path.join(ROOT, 'scripts', 'extract_xlsx.py')], { stdio: 'inherit' });
}


function loadLegacyMatchingFromGit() {
  try {
    const raw = execFileSync('git', ['show', 'HEAD:data/matching-tasks.json'], { encoding: 'utf8' });
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function splitDigits(value) {
  if (Array.isArray(value)) return value.map(String).slice(0, 2);
  return String(value || '')
    .split(/[\s,|-]+/)
    .filter(Boolean)
    .slice(0, 2);
}

function build() {
  const legacyMatching = fs.existsSync(path.join(DATA_DIR, 'matching-tasks.json')) ? JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'matching-tasks.json'),'utf8')) : [];
  const gitLegacyMatching = loadLegacyMatchingFromGit();
  const legacyDigitsByOrganism = new Map([...legacyMatching, ...gitLegacyMatching].map((row) => [row.organismId || row.organism, row.secretDigits]));

  runExtractor();

  const gameConfigRaw = readJson('game-config.json');
  const mcqRaw = readJson('mcq-stages.json');
  const imageRaw = readJson('image-tasks.json');
  const matchingRaw = readJson('matching-tasks.json');
  const finalCipherRaw = readJson('final-cipher.json');

  const gameConfig = {
    gameName: gameConfigRaw['שם המשחק'] || '',
    story: gameConfigRaw['סיפור מסגרת'] || '',
    gateNames: {
      identification: gameConfigRaw['שער 1'] || FLOW.step1,
      secret: gameConfigRaw['שער 2'] || FLOW.step2,
      habitat: gameConfigRaw['שער 3'] || FLOW.step3,
      countElements: gameConfigRaw['שער 4'] || FLOW.step6,
      biomatch: gameConfigRaw['שער 6'] || '',
      cipher: gameConfigRaw['שער 7'] || ''
    }
  };

  const imageByOrganism = new Map(
    imageRaw
      .filter((row) => row.gate === FLOW.step6)
      .map((row) => [
        row.organism,
        {
          gateName: row.gate,
          instruction: row.prompt,
          imageTopic: row.sceneDescription,
          findWhat: row.targetLabel,
          correctAnswer: String(row.correctAnswer),
          hint1: row.hint,
          hint2: row.extraInfo
        }
      ])
  );

  const organisms = [...new Set(mcqRaw.map((row) => row.organism))];
  const mcqStages = organisms
    .map((organism) => {
      const rows = mcqRaw.filter((row) => row.organism === organism);
      const getStep = (gateName) => {
        const row = rows.find((item) => item.gate === gateName);
        if (!row) return null;
        return {
          gateName: row.gate,
          questionType: row.questionType,
          question: row.question,
          correctAnswer: row.correctAnswer,
          options: [row.optionA, row.optionB, row.optionC, row.optionD],
          hint: row.hint,
          didYouKnow: row.didYouKnow || ''
        };
      };

      return {
        organismId: organism,
        organismName: organism,
        step1: getStep(FLOW.step1),
        step2: getStep(FLOW.step2),
        step3: getStep(FLOW.step3),
        step6: imageByOrganism.get(organism) || null,
        biomatchRef: organism,
        finalCipherRef: 'default'
      };
    })
    .filter((item) => item.step1 && item.step2 && item.step3 && item.step6);

  const matchingTasks = matchingRaw.map((row) => ({
    organismId: row.organism,
    mainOrganism: row.mainOrganism,
    instruction: row.prompt,
    pair1: { organism: row.mainOrganism, invention: row.mainInvention },
    pair2: { organism: row.otherOrganism1, invention: row.otherInvention1 },
    pair3: { organism: row.otherOrganism2, invention: row.otherInvention2 },
    mainCorrectMatch: row.solution,
    secretDigits: (() => {
      const direct = splitDigits(row.secretDigits);
      if (direct.length === 2) return direct;
      const legacy = splitDigits(legacyDigitsByOrganism.get(row.organism));
      return legacy;
    })()
  }));

  const finalCipher = {
    gateName: finalCipherRaw.gate,
    instruction: finalCipherRaw.instruction,
    cipherSolution: finalCipherRaw.solution,
    postSolveBehavior: finalCipherRaw.afterSolve,
    continueButtonLabel: finalCipherRaw.continueLabel,
    finalScreenText: finalCipherRaw.endingMessage
  };

  writeJson('game-config.json', gameConfig);
  writeJson('mcq-stages.json', mcqStages);
  writeJson('matching-tasks.json', matchingTasks);
  writeJson('image-tasks.json', imageRaw.filter((row) => row.gate === FLOW.step6).map((row) => ({
    organismId: row.organism,
    gateName: row.gate,
    instruction: row.prompt,
    imageTopic: row.sceneDescription,
    findWhat: row.targetLabel,
    correctAnswer: String(row.correctAnswer),
    hint1: row.hint,
    hint2: row.extraInfo
  })));
  writeJson('final-cipher.json', finalCipher);

  console.log('Built structured game data from biomimicry_escape_room.xlsx');
}

build();
