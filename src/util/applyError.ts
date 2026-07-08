'use strict';

import { main, loadingDiv } from '../nodes.ts';

const applyError = (message: string): void => {
  loadingDiv.classList.add('error');
  loadingDiv.querySelector('div[role="text"]')!.textContent = message;
  main.classList = 'loading';
};

export default applyError;
