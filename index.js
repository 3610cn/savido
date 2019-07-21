import https from  'https';
import fs from 'fs';
import path from 'path';
import url from 'url';

import shelljs from 'shelljs';
import _ from 'lodash';
import axios from 'axios';
import jsdom from 'jsdom';
import Progress from 'cli-progress';
import { mainHtml, downloadHtml } from './html';
import { makeArray } from './helper';

const { JSDOM } = jsdom;

// At instance level
const instance = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false
  })
});

const URL_SEEDS = [
  'https://www.savido.net/sites/youporn',
];

async function main(startUrl) {
  const { status, data } = await instance.get(startUrl);
  if (status === 200) {
    const dom = new JSDOM(data);
    const document = dom.window.document;
    const links = makeArray(document.querySelectorAll('#TopVideos a[href^="/download"]'))
      .map(elem => elem.getAttribute('href'));

    await _.reduce(
      links,
      (prev, link) => {
        return prev.then(async () => {
          const finalUrl = url.resolve(startUrl, link);
          try {
            await parseDownloadPage(finalUrl);
          } catch(e) {
            console.log(e, finalUrl);
            return Promise.resolve();
          }
        });
      },
      Promise.resolve(),
    );
  }
}

async function parseDownloadPage(url) {
  const { status, data } = await instance.get(url);
  if (status === 200) {
    const dom = new JSDOM(data);
    const document = dom.window.document;
    const videoUrl = document.querySelector('.container table')
      .querySelector('tr:last-child a')
      .getAttribute('href');
    await downloadVideo(videoUrl);
  }
}

async function downloadVideo(videoUrl) {
  if (!videoUrl) {
    return;
  }
  const pathname = url.parse(videoUrl).pathname.slice(1);
  const dir = 'videos';
  ensure(dir);
  const localPath = path.join(dir, pathname.slice(pathname.lastIndexOf('/') + 1));
  console.log(`downloading ${videoUrl} to ${localPath}`);
  const bar = new Progress.Bar({}, Progress.Presets.shades_classic);
  let progressStart = false;
  const { data } = await instance.get(
    videoUrl,
    {
      responseType: 'stream',
      onDownloadProgress: ({ loaded, total }) => {
        if (progressStart === false) {
          progressStart = true;
          bar.start(total, loaded);
        } else if (loaded >= total) {
          bar.stop();
        } else {
          bar.update(loaded);
        }
    },
    },
  );
  data.pipe(fs.createWriteStream(localPath));

  return new Promise((resolve, reject) => {
    data.on('end', () => {
      resolve()
    })

    data.on('error', err => {
      reject(err)
    })
  })
}

function ensure(dir) {
  shelljs.mkdir('-p', dir);
}

main(URL_SEEDS[0]);
