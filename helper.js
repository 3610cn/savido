import shelljs from 'shelljs';

export function makeArray(arrayLike) {
  return Array.prototype.slice.call(arrayLike);
}

export function ensure(dir) {
  shelljs.mkdir('-p', dir);
}
