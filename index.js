import https from  'https';
import fs from 'fs';
import path from 'path';
import url from 'url';

import shelljs from 'shelljs';
import _ from 'lodash';
import axios from 'axios';
import jsdom from 'jsdom';
import Progress from 'cli-progress';
import dayjs from 'dayjs';

import { mainHtml, downloadHtml } from './html';
import { makeArray } from './helper';

const { JSDOM } = jsdom;

// At instance level
const instance = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false
  })
});

const formatUrl = site => `https://www.savido.net/sites/${site}`;

const alreadyDownloads = (function() {
  return shelljs.find(path.join(__dirname, 'videos', 'youporn'))
    .filter(file => file.match(/\.mp4$/))
    .map(file => file.slice(file.lastIndexOf('/') + 1));
}());

const isAlreadyDownloaded = (filename) => {
  return alreadyDownloads.includes(filename);
}

const SITES = [
  'youporn',
  'pornhub',
];

async function main(site) {
  const startUrl = formatUrl(site);
  console.log(`downloading ${startUrl}`)
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
            await parseDownloadPage(finalUrl, site);
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

async function parseDownloadPage(url, site) {
  const { status, data } = await instance.get(url);
  if (status === 200) {
    const dom = new JSDOM(data);
    const document = dom.window.document;
    const videoUrl = document.querySelector('.container table')
      .querySelector('tr:last-child a')
      .getAttribute('href');
    await downloadVideo(videoUrl, site);
  }
}

async function downloadVideo(videoUrl, site) {
  if (!videoUrl) {
    return;
  }
  const pathname = url.parse(videoUrl).pathname.slice(1);
  const date = dayjs().format('YYYY-MM-DD')
  const dir = path.join(__dirname, 'videos', site, date);
  const filename = pathname.slice(pathname.lastIndexOf('/') + 1);
  if (isAlreadyDownloaded(filename)) {
    console.log(`${filename} video downloaded before, ignore it`);
    return;
  }
  if (filename.startsWith('240P')) {
    console.log(`${filename} is laji, ignore it`);
    return;
  }
  ensure(dir);
  const localPath = path.join(dir, filename);
  if (fs.existsSync(localPath)) {
    console.log(`${localPath} video already exists, ignore it`);
    return;
  }
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

(async function() {
  for (let i = 0, len = SITES.length; i < len; i++) {
    await main(SITES[i]);
  }
})();
