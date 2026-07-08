'use strict';

import '../styles/backgroundsTab.scss';

import Tab, { MdxCtx } from './tab.tsx';
import { useContext, For } from 'solid-js';
import type { JSX } from 'solid-js/types/jsx.d.ts';

function BackgroundsTab(): JSX.Element {
  const mdx = useContext(MdxCtx);

  return (<Tab tabId="bgs">
    <For each={mdx.versionList().filter((ver) => mdx.hasBackground(ver))}>
      {(ver) => {
        const bg = mdx.getBackground(ver)!;

        return (<div class="modelitem" role="row">
          <img loading="lazy" class="backgroundimage" src={bg.downloadurl} />
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

export default BackgroundsTab;

