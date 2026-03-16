import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

mcq = json.loads((ROOT / 'data/mcq-stages.json').read_text(encoding='utf-8'))
image_tasks = json.loads((ROOT / 'data/image-tasks.json').read_text(encoding='utf-8'))
matching = json.loads((ROOT / 'data/matching-tasks.json').read_text(encoding='utf-8'))
cipher = json.loads((ROOT / 'data/final-cipher.json').read_text(encoding='utf-8'))

organisms = sorted({row['organism'] for row in mcq})
required_mcq_gates = {'שער הגילוי הנסתר', 'שער הסוד הקדום', 'שער הרמזים הנעלמים', 'שער ההשראה החכמה'}

for organism in organisms:
    gates = {row['gate'] for row in mcq if row['organism'] == organism}
    missing = required_mcq_gates - gates
    if missing:
        raise SystemExit(f'Missing MCQ gates for {organism}: {missing}')

    if not any(row['organism'] == organism for row in image_tasks):
        raise SystemExit(f'Missing image task for {organism}')

    if not any(row['organism'] == organism for row in matching):
        raise SystemExit(f'Missing matching task for {organism}')

allowed_did_you_know = {'שער הסוד הקדום', 'שער ההשראה החכמה'}
for row in mcq:
    if row['didYouKnow'] and row['gate'] not in allowed_did_you_know:
        raise SystemExit(f"Unexpected 'הידעת' in gate {row['gate']} for {row['organism']}")

if cipher.get('solution') != 'ההשראה מן הטבע הקסום':
    raise SystemExit('Final cipher solution does not match expected sentence')

print('Data validation passed')
