export const fmtPt = (n: number): string => {
  const v = Math.round(n * 10) / 10;
  return (v > 0 ? "+" : "") + v;
};
