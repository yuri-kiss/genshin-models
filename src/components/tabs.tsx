'use strict';

import '../styles/tabs.scss';

import Tab, { TabCtx, MdxCtx } from './tab.tsx';
import { appDiv } from '../nodes.ts';
import { createSignal } from 'solid-js';
import TabList from './tabList.tsx';
import type { JSX } from 'solid-js/types/jsx.d.ts';
import type ModelsIndex from '../util/modelsIndex.ts';

import CreditsTab from './creditsTab';
import StatsTab from './statsTab.tsx';
import BackgroundsTab from './backgroundsTab.tsx';

function Tabs(props: { mdx: ModelsIndex }): JSX.Element {
  const tabSignal = createSignal(window.location.hash.slice(1, Infinity) || 'models');

  const setTab = (next: string) => {
    if (next === '') {
      return;
    }
    appDiv.setAttribute('data-tabid', next);
    window.location.hash = `#${next}`;
    return void tabSignal[1](next);
  };

  window.addEventListener('hashchange', () => {
    const nextTabId = window.location.hash.slice(1, Infinity) || '';
    if (!nextTabId || tabSignal[0]() === nextTabId) {
      return;
    }
    setTab(nextTabId);
  });

  return (<MdxCtx.Provider value={props.mdx}><TabCtx.Provider value={[
    () => tabSignal[0](),
    setTab,
  ]}>
    <TabList />
    <div role="tablist" data-tabid={tabSignal[0]()}>
      <Tab tabId="models"></Tab>
      <BackgroundsTab />
      <StatsTab />
      <CreditsTab />
    </div>
  </TabCtx.Provider></MdxCtx.Provider>);
}
export default Tabs;
