import fs from 'fs';
import path from 'path';
import shelljs from 'shelljs';
import { ensure } from './helper';

const alreadyDownloads = () => {
  const videosPath = path.join(__dirname, 'videos');
  ensure(videosPath);
  const files = shelljs.find(videosPath);
  return files.filter(file => file.match(/\.mp4$/))
    .map(file => file.slice(file.lastIndexOf('/') + 1));
};


export default class Cache {

  constructor() {
    this.data = alreadyDownloads();
  }

  isExists(filename) {
    return this.data.includes(filename);
  }

  add(filename) {
    this.data.push(filename);
    fs.writeFile(
      path.join(__dirname, '.data'),
      filename,
      {
        flag: 'a'
      },
      (err) => {
        console.log(err);
      }
    );
  }
}