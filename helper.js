import shelljs from 'shelljs';

export function makeArray(arrayLike) {
  return Array.prototype.slice.call(arrayLike);
}

export function ensure(dir) {
  shelljs.mkdir('-p', dir);
}

export function generateUrls(seed)  {
  const result = [];
  const reg = /\{(\d+),\s*(\d+)\}/;
  const match = seed.match(reg);
  if (match) {
    const [_, start, end] = Array.from(match).map(item => parseInt(item, 10));
    for (let i = start; i <= end; i++) {
      result.push(seed.replace(reg, i));
    }
    return result;
  }
  return seed.split(',');
}

// const a = generateUrls('http://wqweqwe.com/?page={1, 3}')
// console.log(a);
