export function buildSegments(prizes) {
  const total = prizes.reduce((s, p) => s + p.weight, 0);
  let acc = 0;

  return prizes.map((p) => {
    const startPct = (acc / total) * 100;
    acc += p.weight;
    const endPct = (acc / total) * 100;
    return { ...p, startPct, endPct };
  });
}

export function pickSegment(segments) {
  const r = Math.random() * 100;
  return segments.find(
    (s) => r >= s.startPct && r < s.endPct
  );
}
