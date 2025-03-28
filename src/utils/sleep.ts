/**
 * 睡眠
 * @param ms
 * @returns
 */
export const sleep = (ms?: number) => new Promise<void>((reolsve) => setTimeout(reolsve, ms));
