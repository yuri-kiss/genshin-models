  // const modelsTab = tabsDiv.querySelector(`div[data-tabid="models"]`);
  // for (let i = 0, character; i < data._$.characters.length; ++i) {
  //   if (data._$.characters[i].includes('[Emotes]')) continue;
  //   const node = document.createElement('div');
  //   node.classList = 'modelitem';
  //   node.setAttribute('aria-role', 'row');
  //   node._character = {};

  //   const statsNode = document.createElement('span');

  //   character = data.getCharacter(data._$.characters[i], null, true);
  //   node._character[character.version] = character;
  //   statsNode.appendChild(document.createTextNode(character.name + ': '));

  //   const characterCount = data.getCharacterCount(character.name);

  //   {
  //     const wishIcon = document.createElement('img');
  //     wishIcon.classList = 'modelitemicon';
  //     wishIcon.loading = 'lazy';
  //     wishIcon.src = `wishes/${character.name.replace(/\(alt(ernate)?[ ]*((skin)?|(event)?|(outfit)?)\)/gi, '').replaceAll('  ', ' ').trim()}.png`;
  //     wishIcon.addEventListener('error', () => {
  //       if (wishIcon.src.includes('default.png')) return;
  //       wishIcon.src = 'default.png';
  //     });
  //     if (wishIcon.src.includes('(')) console.warn(character.name);
  //     node.appendChild(wishIcon);
  //   };

  //   {
  //     const temp = document.createElement('div');
  //     temp.classList = 'modelitemname';
  //     temp.textContent = character.name;
  //     node.appendChild(temp);
  //   };

  //   const central = document.createElement('div');
  //   central.classList = 'modelitemcentral';
  //   node.appendChild(central);

  //   const downloadButton = document.createElement('a');
  //   downloadButton.classList = 'modelitemdownloadbutton';
  //   downloadButton.target = '_blank';
  //   downloadButton.href = character.downloadurl;
  //   downloadButton.download = `${character.version} - ${character.downloadfile}`;
  //   downloadButton.setAttribute('aria-role', 'button');
  //   downloadButton.textContent = 'Download model';
  //   central.appendChild(downloadButton);

  //   const versionOption = document.createElement('select');
  //   versionOption.addEventListener('change', () => {
  //     const character = node._character[versionOption.value];
  //     downloadButton.href = character.downloadurl;
  //     downloadButton.download = `${character.version} - ${character.downloadfile}`;
  //   });
  //   {
  //     const temp = document.createElement('option');
  //     temp.value = character.version;
  //     temp.textContent = character.version;
  //     versionOption.appendChild(temp);
  //   };
  //   central.appendChild(versionOption);

  //   let versions = [character.version];
  //   if (character.version !== '1.0') {
  //     for (let j = data._$.versions.indexOf(character.version) + 1,
  //              version, temp; j < data._$.versions.length; ++j) {
  //       temp = character;
  //       version = data._$.versions[j];
  //       character = data.getCharacter(character.name, version, true);
  //       if (character == null) {
  //         character = temp;
  //         continue;
  //       }
  //       versions.push(version);
  //       node._character[version] = character;

  //       temp = document.createElement('option');
  //       temp.value = character.version;
  //       temp.textContent = character.version;
  //       versionOption.appendChild(temp);
  //     }
  //   }
  //   character = null;

  //   {
  //     const statsMark = document.createElement('mark');
  //     statsMark.textContent = `(${characterCount}) in ${versions.join(', ')}`;
  //     statsNode.appendChild(statsMark);
  //   };

  //   statsHolder.appendChild(statsNode);
  //   statsHolder.appendChild(document.createElement('br'));
  //   modelsTab.appendChild(node);
  // }
  // statsTab.appendChild(statsHolder);

'use strict';

import '../styles/modelsTab.scss';

import Tab, { MdxCtx } from './tab.tsx';
import { useContext, For } from 'solid-js';
import type { JSX } from 'solid-js/types/jsx.d.ts';

function ModelsTab(): JSX.Element {
  const mdx = useContext(MdxCtx);

  return (<Tab tabId="bgs">
    <For each={mdx.characterList().filter((name) => !name.includes('[Emotes]'))}>
      {(name) => {
        const ch = mdx.getCharacter(name, null, true)!;

        return (<div class="modelitem" role="row">
          <img loading="lazy" class="backgroundimage" src={ch.downloadurl} />
          <div class="modelitemname backgrounditemversion">{ver}</div>
          <div class="modelitemcentral">
            <a role="button" class="modelitemdownloadbutton" target="_blank" download={`${ver} - ${bg.downloadfile}`} href={bg.downloadurl}>Download</a>
            <a role="button" class="modelitempreviewbutton" target="_blank" href={bg.downloadurl}>Preview</a>
          </div>
        </div>);
      }}
    </For>
  </Tab>);
}

export default ModelsTab;
