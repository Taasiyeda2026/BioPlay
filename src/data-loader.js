const DATA_FILES = {
  config: 'data/game-config.json',
  mcq: 'data/mcq-stages.json',
  imageTasks: 'data/image-tasks.json',
  matching: 'data/matching-tasks.json',
  cipher: 'data/final-cipher.json'
};

export async function loadGameData() {
  const entries = await Promise.all(
    Object.entries(DATA_FILES).map(async ([key, path]) => {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Failed to load ${path}`);
      }
      return [key, await response.json()];
    })
  );

  const raw = Object.fromEntries(entries);
  const organisms = [...new Set(raw.mcq.map((item) => item.organism))];

  return {
    ...raw,
    organisms,
    getTrack(organism) {
      return {
        mcq: raw.mcq.filter((item) => item.organism === organism),
        imageTask: raw.imageTasks.find((item) => item.organism === organism),
        matchingTask: raw.matching.find((item) => item.organism === organism)
      };
    }
  };
}
