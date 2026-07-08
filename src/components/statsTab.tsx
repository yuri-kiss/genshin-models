'use strict';

import Tab, { MdxCtx } from './tab.tsx';
import { useContext } from 'solid-js';
import type { JSX } from 'solid-js/types/jsx.d.ts';

function StatsTab(): JSX.Element {
  const mdx = useContext(MdxCtx);

  return (<Tab tabId="stats">
    <div style="margin-top: 15px; margin-left: 15px">
      <strong>Last updated: {(new Date(mdx.lastUpdate())).toISOString()}</strong><br />
      <br />
      <span>Total model count: <mark>{mdx.totalCharacterCount()}</mark></span><br />
      <span>Total background count: <mark>{mdx.totalBackgroundCount()}</mark></span><br />
    </div>
  </Tab>);
}

export default StatsTab;
