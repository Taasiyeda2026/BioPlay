import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def read(name):
    return json.loads((ROOT / 'data' / name).read_text(encoding='utf-8'))

config = read('game-config.json')
mcq = read('mcq-stages.json')
matching = read('matching-tasks.json')
images = read('image-tasks.json')
cipher = read('final-cipher.json')

assert config.get('gameName'), 'gameName missing'
assert config.get('story'), 'story missing'

for row in mcq:
    assert row['step1'] and row['step2'] and row['step3'], f"Missing mcq steps for {row['organismId']}"
    assert row['step6'], f"Missing step6 for {row['organismId']}"

mcq_ids = {row['organismId'] for row in mcq}
for row in matching:
    assert row['organismId'] in mcq_ids, f"matching without mcq: {row['organismId']}"
    assert len(row.get('secretDigits', [])) == 2, f"secretDigits missing for {row['organismId']}"

for row in images:
    assert row['organismId'] in mcq_ids, f"image without mcq: {row['organismId']}"

for key in ['gateName', 'instruction', 'cipherSolution', 'postSolveBehavior', 'continueButtonLabel', 'finalScreenText']:
    assert cipher.get(key), f'{key} missing in final-cipher'

print('Data validation passed')
