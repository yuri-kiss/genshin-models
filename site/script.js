'use strict';
void !async function() {
  /** debugging redirect while I work on the site **/
  if (window.location.host !== 'localhost') {
    window.location.href = 'https://miyo.icu/';
    return;
  }
  const main = document.querySelector('main');
  const loadingDiv = document.querySelector('main > div#loading');
  const appDiv = document.querySelector('main > div#app');

  function applyError(message) {
    loadingDiv.classList.add('error');
    loadingDiv.querySelector('div[role="text"]').textContent = message;
    main.classList = 'loading';
  }

  let data = null;
  {
    const response = await fetch('ver/data.json');
    if (!response.ok || response.type !== 'basic' || !response.body) {
      console.error('Bad models index response:', response);
      applyError('Failed to fetch models index.');
      return;
    }
    data = await response.json();
  };

  console.debug('Models index:', structuredClone(data));
  {
    const rfm = {
      lastupdate: data.date,
      totalcount: data.total,
      characters: Object.keys(data.count),
      versions: Object.keys(data.versions),
      backgrounds: {},
      models: data.versions,
      count: data.count,
    };
    for (let i = 0, version; i < rfm.versions.length; ++i) {
      version = rfm.versions[i];
      if (!rfm.models[version].BACKGROUND) continue;
      rfm.backgrounds['' + version] = rfm.models[version].BACKGROUND;
      Reflect.deleteProperty(rfm.models[version], 'BACKGROUND');
    }
    data = rfm;
    console.log('Models index (reformatted):', structuredClone(data));
  };
  data = new (class ModelsIndex {
    constructor(data) {
      this._$ = data;
    }
    
    lastUpdate() {
      return this._$.lastupdate;
    }
    hasVersion(version) {
      return this._$.versions.indexOf('' + version) !== -1;
    }

    hasBackground(version) {
      return Object.prototype.hasOwnProperty.call(this._$.backgrounds, '' + version);
    }
    getBackground(version) {
      if (!this.hasBackground(version)) return null;
      version = '' + version;
      return {
        downloadurl: `ver/${version}/${this._$.backgrounds[version][0]}`,
        originalurl: this._$.backgrounds[version][1],
        downloadfile: this._$.backgrounds[version][0],
      };
    }

    hasCharacter(character, version) {
      if (!isNaN(version)) {
        if (!this.hasVersion(version)) return false;
        return Object.prototype.hasOwnProperty.call(this._$.models[version], character);
      }
      return this._$.characters.indexOf(character) !== -1;
    }
    getCharacterCount(character) {
      if ((character ?? '').trim() === '') {
        return this._$.totalcount;
      }
      if (!this.hasCharacter(character)) return 0;
      return this._$.count[character];
    }
    getCharacter(character, version, skipCount) {
      version = '' + version;
      if (!this.hasCharacter(character, version)) return null;
      const data = {
        count: -1,
      };
      if (!skipCount) data.count = this.getCharacterCount(character);
      if (isNaN(version)) {
        for (let i = 0; i < this._$.versions.length; ++i) {
          if (!this.hasCharacter(character, this._$.versions[i])) continue;
          version = this._$.versions[i];
          break;
        }
      }
      const temp = this._$.models[version][character];
      data.name = character;
      data.version = version;
      data.downloadfile = temp[0];
      data.downloadurl = `ver/${version}/${temp[0]}`;
      data.originalurl = temp[1];
      data.notes = temp[2];
      return data;
    }
  })(data);
  console.log('Models index (latest):', data);

  const tabList = appDiv.querySelector('div[role="toolbar"]');
  const tabsDiv = appDiv.querySelector('div[role="tablist"]');
  function switchTab(id, event) {
    if (id === tabsDiv.dataset.tabid) return false;
    event.preventDefault();
    {
      const prev = tabsDiv.querySelector(`div[data-tabid="${tabsDiv.dataset.tabid}"]`);
      prev.ariaHidden = true;
      const tab = tabList.querySelector(`a[data-tabid="${tabsDiv.dataset.tabid}"]`);
      tab.classList.remove('activeT');
      tab.ariaChecked = false;
      prev.ariaSelected = false;
      prev.classList.add('hiddenT');
    };
    tabsDiv.dataset.tabid = id;
    const curr = tabsDiv.querySelector(`div[data-tabid="${id}"]`);
    curr.ariaHidden = false;
    const tab = tabList.querySelector(`a[data-tabid="${id}"]`);
    tab.classList.add('activeT');
    tab.ariaChecked = true;
    curr.ariaSelected = true;
    curr.classList.remove('hiddenT');
    appDiv.dataset.tabid = id;
    window.location.hash = `#${id}`;
    return true;
  }
  tabList.querySelectorAll('a').forEach(node => {
    node.addEventListener('click', switchTab.bind(this, node.dataset.tabid));
  });

  const modelsTab = tabsDiv.querySelector(`div[data-tabid="models"]`);
  for (let i = 0, character; i < data._$.characters.length; ++i) {
    if (data._$.characters[i].includes('[Emotes]')) continue;
    const node = document.createElement('div');
    node.classList = 'modelitem';
    node.setAttribute('aria-role', 'row');
    node._character = {};

    character = data.getCharacter(data._$.characters[i], null, true);
    node._character[character.version] = character;

    {
      const wishIcon = document.createElement('img');
      wishIcon.classList = 'modelitemicon';
      wishIcon.loading = 'lazy';
      wishIcon.src = `site/wishes/${character.name.replace(/\(alt(ernate)?[ ]*((skin)?|(event)?|(outfit)?)\)/gi, '').replaceAll('  ', ' ').trim()}.png`;
      wishIcon.addEventListener('error', () => {
        if (wishIcon.src.includes('default.png')) return;
        wishIcon.src = 'site/default.png';
      });
      if (wishIcon.src.includes('(')) console.warn(character.name);
      node.appendChild(wishIcon);
    };

    {
      const temp = document.createElement('div');
      temp.classList = 'modelitemname';
      temp.textContent = character.name;
      node.appendChild(temp);
    };

    const central = document.createElement('div');
    central.classList = 'modelitemcentral';
    node.appendChild(central);

    const downloadButton = document.createElement('a');
    downloadButton.classList = 'modelitemdownloadbutton';
    downloadButton.target = '_blank';
    downloadButton.href = character.downloadurl;
    downloadButton.download = `${character.version} - ${character.downloadfile}`;
    downloadButton.setAttribute('aria-role', 'button');
    downloadButton.textContent = 'Download model';
    central.appendChild(downloadButton);

    const versionOption = document.createElement('select');
    versionOption.addEventListener('change', () => {
      const character = node._character[versionOption.value];
      downloadButton.href = character.downloadurl;
      downloadButton.download = `${character.version} - ${character.downloadfile}`;
    });
    {
      const temp = document.createElement('option');
      temp.value = character.version;
      temp.textContent = character.version;
      versionOption.appendChild(temp);
    };
    central.appendChild(versionOption);

    if (character.version !== '1.0') {
      for (let j = data._$.versions.indexOf(character.version) + 1,
               version, temp; j < data._$.versions.length; ++j) {
        temp = character;
        version = data._$.versions[j];
        character = data.getCharacter(character.name, version, true);
        if (character == null) {
          character = temp;
          continue;
        }
        node._character[version] = character;

        temp = document.createElement('option');
        temp.value = character.version;
        temp.textContent = character.version;
        versionOption.appendChild(temp);
      }
    }
    character = null;

    modelsTab.appendChild(node);
  }

  tabsDiv.querySelector(`div[data-tabid="credits"]`).innerHTML = `<div style="margin-top: 15px; margin-left: 15px"><span>
    Created by <a href="https://miyo.icu/">Miyo Sho</a> &lt;<a href="mailto:meow@miyo.icu">meow@miyo.icu</a>&gt;.<br />
    Models are sourced from miHoYo and so are the wish images and backgrounds, I don't own any of the assets used on this website.<br />
    Special thanks to <a href="https://www.hoyolab.com/accountCenter/postList?id=82180096">JohnSlaughter</a> for making the original spreadsheet this was based on!<br />
  </span></div>`;

  const backgroundsTab = tabsDiv.querySelector(`div[data-tabid="bgs"]`);
  for (let i = 0, version; i < data._$.versions.length; ++i) {
    version = data._$.versions[i];
    if (!data.hasBackground(version)) continue;
    
    const node = document.createElement('div');
    const background = data.getBackground(version);
    node.classList = 'modelitem';
    node.setAttribute('aria-role', 'row');

    {
      const backgroundImage = document.createElement('img');
      backgroundImage.classList = 'backgroundimage';
      backgroundImage.loading = 'lazy';
      backgroundImage.src = background.downloadurl;
      node.appendChild(backgroundImage);
    };

    {
      const temp = document.createElement('div');
      temp.classList = 'modelitemname backgrounditemversion';
      temp.style.mixBlendMode = 'exclusion';
      temp.textContent = version;
      node.appendChild(temp);
    };

    {
      const central = document.createElement('div');
      central.classList = 'modelitemcentral';
      node.appendChild(central);

      const downloadButton = document.createElement('a');
      downloadButton.classList = 'modelitemdownloadbutton';
      downloadButton.target = '_blank';
      downloadButton.href = background.downloadurl;
      downloadButton.download = `${version} - ${background.downloadfile}`;
      downloadButton.setAttribute('aria-role', 'button');
      downloadButton.textContent = 'Download';
      central.appendChild(downloadButton);

      const originalViewer = document.createElement('a');
      originalViewer.style.marginLeft = '15px';
      originalViewer.classList = 'modelitemdownloadbutton';
      originalViewer.target = '_blank';
      originalViewer.href = background.originalurl;
      originalViewer.setAttribute('aria-role', 'button');
      originalViewer.textContent = 'Original';
      central.appendChild(originalViewer);
    };

    backgroundsTab.appendChild(node);
  }

  main.classList = 'running';
  globalThis.GenshinModels = data;

  {
    const hash = window.location.hash.slice(1) || '';
    if (!hash) return;
    const node = document.querySelector(`a[data-tabid="${hash}"]`);
    if (!node) return;
    switchTab(hash, new Event('N/A'));
  };
}();
