import fs from 'fs';
import os from 'os';
import path from 'path';
import shelljs from 'shelljs';

const ShellString = shelljs.ShellString;

const DATA_PATH = path.join(__dirname, '.data');

const alreadyDownloads = () => {
  return shelljs.cat(DATA_PATH).split(os.EOL).filter(Boolean);
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
    new ShellString(os.EOL + filename).toEnd(DATA_PATH);
  }
}