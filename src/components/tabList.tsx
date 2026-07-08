'use strict';

import '../styles/tabList.scss';

import { useContext } from 'solid-js';
import { TabCtx } from './tab.tsx';
import type { JSX } from 'solid-js/types/jsx.d.ts';

function Tab(props: { tabId: string, name: string }): JSX.Element {
  const [currentTabId, setTabId] = useContext(TabCtx);

  return (<a role='radio' data-tabid={props.tabId}
      aria-checked={currentTabId() === props.tabId}
      class={currentTabId() === props.tabId ? 'activeT' : ''}
      href={`#${props.tabId}`}
      on:click={(ev: MouseEvent) => (ev.preventDefault(), setTabId(props.tabId))}
    >
      {props.name}
  </a>);
}

function TabList(): JSX.Element {
  return (<div role='toolbar' aria-labelledby='tab selector' aria-orientation='horizontal'>
    <Tab tabId='models'  name='Models' />
    <Tab tabId='bgs'     name='Backgrounds' />
    <Tab tabId='stats'   name='Statistics' />
    <Tab tabId='credits' name='Credits' />
  </div>);
}

export default TabList;
