'use strict';

const process = require('node:process');
{
  const util = require('node:util');
  util.inspect.defaultOptions.depth = 16;
  util.setTraceSigInt(true);
};
process.env['UV_THREADPOOL_SIZE'] = 128;
(() => {return new Promise(async (FINAL_RESOLVE, FINAL_REJECT) => {

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const fetch = require('node-fetch').default;
const rimraf = require('rimraf');
const childProcess = require('node:child_process');

const ArgumentParser = require('argparse').ArgumentParser;
const csvparse = require('csv-parse');

const argparser = new ArgumentParser({
  add_help: true,
  description: 'CLI tool that can download and organize (AND MORE) the stuff for the Genshin Model document by JohnSlaughter',
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
argparser.add_argument('--nozip', {
  action: 'store_true',
  help: 'Disable the conversion step for RAR/7Z to zip',
});
argparser.add_argument('--nodl', {
  action: 'store_true',
  help: 'Disables the downloading step',
});
argparser.add_argument('--rmd', {
  action: 'store_true',
  help: 'Goes through every file and removes duplicates per subfolder (keeps newest)',
});
const args = argparser.parse_args();

const lock = new (class Lock {
  constructor() {
    this._waiters = [];
    this._promise = null;
  }
  async acquire() {
    if (this.isBusy) {
      const i = Math.random();
      this._waiters.push(i);
      for (;this._waiters[0] !== i;) {
        await this._promise;
      }
    }
    const pattern = [() => { throw 'resolve is not setup' }, () => { throw 'reject is not setup' }];
    this._promise = new Promise((resolve, reject) => {
      pattern[0] = resolve;
      pattern[1] = reject;
    }).catch((error) => {
      if (!args.silent) console.error('Lock promise errored.', error);
      throw error;
    });
    this._waiters.shift();
    return (err, done) => void(err ? pattern[1](err) : pattern[0][done]);
  }
  get isBusy() {
    return !!this._promise;
  }
});

async function convertArchiveToZip(archive, output) {
  archive = path.posix.resolve(fs.realpathSync(archive));
  output = path.posix.join(fs.realpathSync(path.dirname(path.resolve(output))), path.basename(output));

  if (fs.existsSync('.tmp')) {
    await rimraf.rimraf('.tmp', {});
  }
  await fs.promises.mkdir('.tmp');

  await childProcess.execSync(`7z x ${JSON.stringify(archive)} -o.tmp`, {
    cwd: __dirname,
  });
  await childProcess.execSync(`7z a -tzip ${JSON.stringify(output)} *`, {
    cwd: '.tmp',
  });
}

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
  return fetch(dlURL).then((response) => {
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
    throw error;
  });
}

let modelsJSON = {
  count: { __proto__: null },
  versions: { __proto__: null },
  zipMap: { __proto__: null },
  latest: -1, total: 0,
  date: 0,
};

let toZipQueue = [];
async function tryArchiveToZip({ fileName, folder }) {
  const free = await lock.acquire();

  const zipDir = path.posix.resolve(__dirname, path.join(folder, 'rezip'));
  const zipPath = path.posix.join(zipDir, path.basename(fileName, path.extname(fileName))) + '.zip';
  const archivePath = path.posix.resolve(__dirname, path.join(folder, fileName));

  modelsJSON.zipMap[`${folder}/${fileName}`] = `${folder}/rezip/${path.basename(zipPath)}`;
  if (fs.existsSync(zipPath)) {
    if (!args.silent && args.dbg) console.debug('Skipping non-zip conversion of', fileName);
    return;
  }
  if (!args.silent && args.dbg) console.debug('Converting non-zip', fileName, 'into a zip...');
  await convertArchiveToZip(archivePath, zipPath);

  free();
}

let csvDone = false;
let latest = -1, total = 0;
let version = '-1', folder = 'nil', frame = '';
if (!args.nodl) {
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
        folder = `public/ver/${version}`;
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
          if (!args.silent && args.dbg && !args.nnw) console.debug(`Skipping background.${type} at ${dlURL}`);
          return;
        }
        return doFileDownload.bind(this, { dlURL: data[KEY_URL], fileName: `background.${type}`, folder })().catch((error) => {
          if (!args.silent) console.error('File download errored.', error);
          throw error;
        });
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
      const isZIP = dlURL.endsWith('zip');
      if (isZIP) fileName += '.zip';
      else if (dlURL.endsWith('rar')) fileName += '.rar';
      else if (dlURL.endsWith('7z')) fileName += '.7z';
      else {
        if (!args.silent) console.warn('Could not find attachment type for', fileName);
        return;
      }
      if (!isZIP && !fs.existsSync(path.join(folder, 'rezip'))) {
        fs.mkdirSync(path.join(folder, 'rezip'));
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
        if (!args.silent && args.dbg && !args.nnw) console.debug('Skipping', fileName, `at ${dlURL}`);
        if (!isZIP) {
          toZipQueue.push({ fileName, folder });
        }
        return;
      }
      if (!isZIP) {
        toZipQueue.push({ fileName, folder });
      }
      doFileDownload.bind(this, { dlURL, fileName, folder })().catch((error) => {
        if (!args.silent) console.error('File download errored.', error);
        throw error;
      });
    }).on('end', () => void(csvDone = true));

    await new Promise((resolve) => {
      let interval = -1;
      interval = setInterval(() => {
        if (!(csvDone && downloading <= 0)) return;
        clearInterval(interval);
        resolve();
      }, 100);
    }).catch((error) => {
      if (!args.silent) console.error('Download waiter promise errored.', error);
      throw error;
    });
  }

  if (!args.nozip) {
    for (let opts; opts = toZipQueue.pop();) {
      await tryArchiveToZip(opts);
    }
  }

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
  })).catch((error) => {
    if (!args.silent) console.error('SHA512 promise errored.', error);
    throw error;
  });

  async function hashFilesInDirectory(directory, match, recursive) {
    directory = fs.realpathSync(directory);


    const files = fs.readdirSync(directory);
    const fileCount = files.length;

    const hashes = { __proto__: null };
    for (let i = 0, p; i < fileCount; ++i) {
      p = path.join(directory, files[i]);

      if (fs.statSync(p).isDirectory()) {
        if (recursive) {
          Object.assign(hashes, await hashFilesInDirectory(p, match, true));
        }
        continue;
      }

      if (!match.test(files[i])) continue;

      if (!args.silent) console.log('Hashing file:', p);
      hashes[p] = [await sha512(fs.createReadStream(p)), fs.statSync(p).ctimeMs];
    }
    return hashes;
  }

  const hashes = await hashFilesInDirectory('public/ver', /^.+\.(7z|rar|zip|jpg|png|jpeg)$/, true);
  if (args.rmd) {
    const VMATCH = /ver[/\\]\d+\.\d+/;
    let hashEntries = Object.entries(hashes);
    for (let j = 0, file, ver; j < hashEntries.length; ++j) {
      file = hashEntries[j][0];
      ver = file.match(VMATCH)[0];
      if (!args.silent) console.log('Checking', file);
      const hash = hashEntries[j][1][0];
      const other = hashEntries.find(key => key[0] !== file && key[1][0] === hash && key[0].match(VMATCH)[0] === ver);
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

  // hashes.date = Date.now();
  // fs.writeFileSync('public/ver/hashes.json', JSON.stringify(hashes));

  if (!args.nodl && !args.nozip) {
    modelsJSON.date = Date.now();
    fs.writeFileSync('public/ver/data.json', JSON.stringify(modelsJSON));
  } else if (!args.silent) {
    console.warn('data.json cannot be written when nodl or nozip are enabled.');
  }

  if (fs.existsSync('.tmp')) {
    await rimraf.rimraf('.tmp', {});
  }

  FINAL_RESOLVE();
});})();
