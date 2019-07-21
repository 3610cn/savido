export function makeArray(arrayLike) {
  return Array.prototype.slice.call(arrayLike);
}