/** True durante `next build` — evita chamadas externas (Shopee, DB pesado) na compilação. */
export function isNextBuildPhase(): boolean {
  return process.env.NEXT_PHASE === 'phase-production-build';
}
