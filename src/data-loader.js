const FILES = {
  config: 'data/game-config.json',
  mcq: 'data/mcq-stages.json',
  matching: 'data/matching-tasks.json',
  image: 'data/image-tasks.json',
  cipher: 'data/final-cipher.json'
};

export async function loadGameData() {
  const loaded = await Promise.all(
    Object.entries(FILES).map(async ([key, file]) => {
      const response = await fetch(file);
      if (!response.ok) throw new Error(`Failed to load ${file}`);
      return [key, await response.json()];
    })
  );

  const data = Object.fromEntries(loaded);
  const byOrganism = new Map(data.mcq.map((item) => [item.organismId, item]));
  const matchingMap = new Map(data.matching.map((item) => [item.organismId, item]));

  return {
    ...data,
    organisms: data.mcq.map((item) => item.organismName),
    getOrganismBundle(organismId) {
      return {
        stages: byOrganism.get(organismId) || null,
        matching: matchingMap.get(organismId) || null
      };
    }
  };
}
