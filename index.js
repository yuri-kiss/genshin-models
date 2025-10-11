'use strict';
process.env['UV_THREADPOOL_SIZE'] = 128;

(() => {return new Promise(async (FINAL_RESOLVE, FINAL_REJECT) => {

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const fetch = require('node-fetch').default;

const ArgumentParser = require('argparse').ArgumentParser;
const csvparse = require('csv-parse');

const argparser = new ArgumentParser({
  add_help: true,
  description: 'CLI tool to download and organize the Genshin Model document by JohnSlaughter',
});
argparser.add_argument('file', {
  metavar: 'FILE',
  type: String,
  nargs: 1,
  help: 'The CSV file to parse',
});
argparser.add_argument('--silent', {
  action: 'store_true',
  help: 'Disable ALL log output from this program',
});
argparser.add_argument('--nnw', {
  action: 'store_true',
  help: 'Disable network traffic logging',
});
argparser.add_argument('--dbg', {
  action: 'store_true',
  help: 'Enables debug logging for errors (warnings can be disabled using --silent)',
});
argparser.add_argument('--rmd', {
  action: 'store_true',
  help: '(DEBUG) Goes through every file and removes duplicates per subfolder (keeps newest)',
});
const args = argparser.parse_args();

const KEY_NAME = 0;
const KEY_APPEARANCE = 1;
const KEY_NOTES = 2;
const KEY_URL = 3;

function normalizeName(name, note, skipAlt) {
  name = name.split(' ');
  let alt = false, event = false, skin = false;
  let next = [];
  for (let i = 0, v, skip; i < name.length; ++i) {
    v = name[i].toLowerCase();
    if (v.trim() == '' || !isNaN(v)) continue;
    if (v.includes('alt')) {
      alt = true;
      skip = true;
    }
    if (v.includes('event')) {
      event = true;
      skip = true;
    }
    if (v.includes('skin')) {
      skin = true;
      skip = true;
    }
    if (skip) {
      skip = false;
      continue;
    }
    next.push(`${v[0].toUpperCase()}${v.slice(1)}`);
  }
  note = note.toLowerCase();
  if (note.includes('alt')) alt = true;
  if (note.includes('event')) event = true;
  if (note.includes('skin')) skin = true;
  next = next.join(' ').split('/');
  if (next[1]) {
    for (let i = 1; i < next.length; ++i) {
      next[i] = `[${normalizeName(next[i], '', true)}]`;
    }
  }
  if (alt && !skipAlt) next.push(`(alt${event ? ' event' : ''}${skin ? ' skin' : ''})`);
  return next.join(' ');
}

let downloading = 0;
function doFileDownload({ dlURL, fileName, folder }) {
  ++downloading;
  if (!args.silent && !args.nnw) console.log(`Downloading ${fileName} at ${dlURL}`);
  fetch(dlURL).then((response) => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const dest = fs.createWriteStream(path.join(folder, fileName));
    response.body.pipe(dest);
    response.body.on('error', (error) => {
      // todo: Should this decrement the downloading counter?
      if (!args.silent) console.error(`Error while streaming "${dlURL}":`, error);
    });
    dest.on('finish', () => {
      --downloading;
      if (!args.silent && !args.nnw) console.log(`Downloaded ${fileName}`);
    });
  }).catch((error) => {
    --downloading;
    if (!args.silent) console.error(`Failed to fetch "${dlURL}":`, error);
  });
}

let modelsJSON = {
  count: {},
  versions: {},
  latest: -1, total: 0,
  date: 0,
};

let csvDone = false;
let latest = -1, total = 0;
let version = '-1', folder = 'nil', frame = '';
fs.createReadStream(args.file[0])
  .pipe(csvparse.parse({ delimiter: ',' }))
  .on('data', (data) => {
    const name = data[KEY_NAME].toLowerCase();
    if (name.includes('character name') || name.startsWith('**') || name.trim() == '') return;
    if (name.includes('release')) {
      if (frame !== '') {
        fs.writeFileSync(path.join(folder, 'links.txt'), frame);
      }
      version = name.split(' ')[0];
      folder = `ver/${version}`;
      frame = `reference: ${data[KEY_URL]}`;
      if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
      if (!modelsJSON.versions[version]) modelsJSON.versions[version] = {};
      if (!isNaN(version)) {
        const temp = parseFloat(version);
        if (temp > latest) latest = temp;
      }
      return;
    } else if (name.includes('background')) {
      const dlURL = data[KEY_URL];
      let type = '';
      if (dlURL.endsWith('png')) type = 'png';
      else if (dlURL.endsWith('jpg')) type = 'jpg';
      else {
        if (!args.silent) console.warn(`Unable to download background, unknown type in URL ${dlURL}`);
        return;
      }
      frame += `\nbackground: ${dlURL}`;
      modelsJSON.versions[version].BACKGROUND = [`background.${type}`, dlURL, ''];
      if (fs.existsSync(path.join(folder, `background.${type}`))) {
        if (!args.silent && args.dbg) console.debug(`Skipping background.${type} at ${dlURL}`);
        return
      }
      doFileDownload.bind(this, { dlURL: data[KEY_URL], fileName: `background.${type}`, folder })();
      return;
    }
    const dlURL = data[KEY_URL].trim();
    let fileName = normalizeName(name, data[KEY_NOTES]);
    const normal = fileName;
    if (dlURL == '') {
      if (!args.silent) console.warn(fileName, 'is missing a url!');
      return;
    }
    if (fileName.includes('?')) {
      if (!args.silent) console.warn(fileName, 'has to be skipped due to a bad file name');
      return;
    }
    if (dlURL.endsWith('zip')) fileName += '.zip';
    else if (dlURL.endsWith('rar')) fileName += '.rar';
    else {
      if (!args.silent) console.warn('Could not find attachment type for', fileName);
      return;
    }
    frame += `\n${normal}: ${dlURL}`;
    const noteName = `${normal}.notes.txt`;
    if (!fs.existsSync(path.join(folder, noteName)) && data[KEY_NOTES].trim() != '') {
      fs.writeFileSync(path.join(folder, noteName), data[KEY_NOTES]);
    }
    modelsJSON.versions[version][normal] = [fileName, dlURL, (data[KEY_NOTES] || '').trim()];
    if (!modelsJSON.count[normal]) modelsJSON.count[normal] = 0;
    ++modelsJSON.count[normal];
    ++total;
    if (fs.existsSync(path.join(folder, fileName))) {
      if (!args.silent && args.dbg) console.debug('Skipping', fileName, `at ${dlURL}`);
      return;
    }
    doFileDownload.bind(this, { dlURL, fileName, folder })();
  }).on('end', () => void(csvDone = true));

  await new Promise((resolve) => {
    let interval = -1;
    interval = setInterval(() => {
      if (!(csvDone && downloading === 0)) return
      clearInterval(interval);
      resolve();
    }, 100);
  });

  modelsJSON.latest = latest;
  modelsJSON.total = total;

  const sha512 = (stream) => (new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha512');
    stream.on('data', (data) => {
      hash.update(data);
    });
    stream.on('end', () => {
      resolve(hash.digest('hex'));
    });
    stream.on('error', reject);
  }));

  if (args.rmd) {await ((async () => {
    const versions = fs.readdirSync('ver');
    for (let i = 0; i < versions.length; ++i) {
      const folder = path.join('ver', versions[i]);
      if (!fs.statSync(folder).isDirectory()) continue;
      if (!args.silent) console.log('Hashing files in', folder);
      const files = fs.readdirSync(folder);
      const hashes = Object.create(null);
      for (let j = 0; j < files.length; ++j) {
        if (files[j].endsWith('.txt')) continue;
        const file = path.join(folder, files[j]);
        const hash = await sha512(fs.createReadStream(file));
        hashes[file] = [hash, fs.statSync(file).ctimeMs];
      }
      let hashEntries = Object.entries(hashes);
      for (let j = 0, file; j < hashEntries.length; ++j) {
        file = hashEntries[j][0];
        if (!args.silent) console.log('Checking', file);
        const hash = hashEntries[j][1][0];
        const other = hashEntries.find(key => key[0] !== file && key[1][0] === hash);
        if (!other) continue;
        if (hashes[file][1] > other[1][1]) {
          if (!args.silent) console.log('  Deleting duplicate', other[0], file);
          fs.unlinkSync(other[0]);
          delete hashes[other[0]];
          hashEntries = Object.entries(hashes);
        } else {
          if (!args.silent) console.log('  Deleting duplicate', file, other[0]);
          fs.unlinkSync(file);
          delete hashes[file];
          hashEntries = Object.entries(hashes);
        }
      }
    }
  })())}

  modelsJSON.date = Date.now();
  fs.writeFileSync('ver/data.json', JSON.stringify(modelsJSON));

  FINAL_RESOLVE();
});})();
