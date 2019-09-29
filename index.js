import https from  'https';
import fs from 'fs';
import path from 'path';
import url from 'url';

import _ from 'lodash';
import axios from 'axios';
import jsdom from 'jsdom';
import Progress from 'cli-progress';
import dayjs from 'dayjs';

import { ensure, generateUrls, makeArray } from './helper';
import Cache from './Cache';
import minimist from 'minimist';

const { JSDOM } = jsdom;

// At instance level
const instance = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false
  })
});

const formatUrl = site => `https://www.savido.net/sites/${site}`;
const cache = new Cache();

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
  console.log('downlading:', url);
  const { status, data } = await instance.get(url);
  if (status === 200) {
    const dom = new JSDOM(data);
    const document = dom.window.document;
    // 所有下载表格的行
    const trs = document.querySelectorAll('.container table tr');
    const tr = Array.from(trs).filter(item => parseInt(item.textContent, 10) >= 720);
    console.log(`${tr.length}Got`);
    if (tr.length) {
      const videoUrl = tr[0].querySelector('a')
        .getAttribute('href');
      await downloadVideo(videoUrl, site);
    }
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
  if (cache.isExists(filename)) {
    console.log(`${filename} video downloaded before, ignore it`);
    return;
  }
  if (filename.startsWith('240P') || filename.startsWith('480P')) {
    console.log(`${filename} is laji, ignore it`);
    return;
  }
  ensure(dir);
  const localPath = path.join(dir, filename);
  if (fs.existsSync(localPath)) {
    console.log(`${localPath} video already exists, ignore it`);
    return;
  }
  cache.add(filename);
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

async function parsePornhub(startUrl) {
  const { status, data } = await instance.get(startUrl);
  if (status === 200) {
    const dom = new JSDOM(data);
    const document = dom.window.document;
    const links = makeArray(document.querySelectorAll('.videoPreviewBg a[href^="/view_video.php"]'))
      .map(elem => elem.getAttribute('href'));
    await _.reduce(
      links,
      (prev, link) => {
        return prev.then(async () => {
          let finalUrl = url.resolve(startUrl, link);
          finalUrl = `https://www.savido.net/download?url=${encodeURIComponent(finalUrl)}`;
          try {
            await parseDownloadPage(finalUrl, 'pornhub');
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

let { startUrl, site } = minimist(process.argv.slice(2));

function normalizeArg(arg) {
  let result = arg;
  if (result === undefined) {
    result = [];
  } else if (!Array.isArray(result)) {
    result = [result];
  }
  result = result.reduce(
    (total, item) => total.concat(generateUrls(item)),
    [],
  );
  return result;
}

site = normalizeArg(site);
startUrl = normalizeArg(startUrl);


console.log(site, startUrl);

(async function() {
  for (let i = 0, len = site.length; i < len; i++) {
    await main(site[i]);
  }
  for (let i = 0, len = startUrl.length; i < len; i++) {
    await parsePornhub(startUrl[i]);
  }
})();
