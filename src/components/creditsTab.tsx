'use strict';

import '../styles/creditsTab.scss';

import Tab from './tab.tsx';
import type { JSX } from 'solid-js/types/jsx.d.ts';

function CreditsTab(): JSX.Element {
  return (<Tab tabId="credits">
    <div style="margin-top: 15px; margin-left: 15px"><span>
      Created by <a href="https://github.com/yuri-kiss/">Miyo Sho</a> &lt;<a href="mailto:yri5@duck.com">yri5@duck.com</a>&gt;.<br />
      Models are sourced from <a href="https://www.hoyoverse.com/">miHoYo</a> and so are the wish images and backgrounds, I don't own any of the assets used on this website.<br />
      Special thanks to <a href="https://www.hoyolab.com/accountCenter/postList?id=82180096">JohnSlaughter</a> for making the original spreadsheet this was based on!<br />
    </span></div>
  </Tab>);
}

export default CreditsTab;
