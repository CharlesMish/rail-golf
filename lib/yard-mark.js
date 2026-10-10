const MARK = Object.freeze({r6: 0, h3: 1});

export function readMark(value) {
  if (typeof value !== 'string' || !Object.hasOwn(MARK, value)) return null;
  return MARK[value];
}
