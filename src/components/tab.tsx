// 'use strict';

// import '../styles/creditsTab.scss';

// import { Tab } from './tabs.tsx';
// import type { JSX } from 'solid-js/types/jsx.d.ts';

// function CreditsTab(): JSX.Element {
//   return (<Tab tabId="credits">
//     <div style="margin-top: 15px; margin-left: 15px"><span>
//       Created by <a href="https://github.com/yuri-kiss/">Miyo Sho</a> &lt;<a href="mailto:yri5@duck.com">yri5@duck.com</a>&gt;.<br />
//       Models are sourced from <a href="https://www.hoyoverse.com/">miHoYo</a> and so are the wish images and backgrounds, I don't own any of the assets used on this website.<br />
//       Special thanks to <a href="https://www.hoyolab.com/accountCenter/postList?id=82180096">JohnSlaughter</a> for making the original spreadsheet this was based on!<br />
//     </span></div>
//   </Tab>);
// }

// export default CreditsTab;


import { createContext, useContext } from 'solid-js';
import type { JSX } from 'solid-js/types/jsx.d.ts';
import type { Context } from 'solid-js';
import type ModelsIndex from '../util/modelsIndex.ts';

export const MdxCtx: Context<ModelsIndex> = createContext(null as unknown as ModelsIndex, {
  name: 'MdxContext',
});
type TabCtxT = [() => string, (next: string) => void];
export const TabCtx: Context<TabCtxT> = createContext(null as unknown as TabCtxT, {
  name: 'TabContext',
});

function Tab(props: { tabId: string, children?: JSX.Element }): JSX.Element {
  const [getTab] = useContext(TabCtx);

  return (<div
    role="tab"
    data-tabid={props.tabId}
    aria-selected={props.tabId === getTab()}
    class={`tab${props.tabId === getTab() ? '' : ' hiddenT'}`}
    aria-hidden={props.tabId !== getTab()}>
      {props.children}
  </div>);
}
export default Tab;
