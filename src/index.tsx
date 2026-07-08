'use strict';

/** debugging redirect while I work on the site **/
if (window.location.host !== 'localhost:3000' && window.location.host !== 'localhost') {
  window.location.href = 'https://miyo.icu/';
  throw new Error('BRK');
}

import './styles/misc.scss';
import './styles.css';

import ModelsIndex from './util/modelsIndex.ts';
import { createResource, Show, Suspense } from 'solid-js';
import { render } from 'solid-js/web';
import applyError from './util/applyError.ts';
import { appDiv, main } from './nodes.ts';
import Tabs from './components/tabs.tsx';
import type { JSX } from 'solid-js/types/jsx.d.ts';

function Root(): JSX.Element {
  const [mdx] = createResource(async () => {
    const response = await fetch('ver/data.json');
    if (!response.ok || response.type !== 'basic' || !response.body) {
      console.error('Bad models index response:', response);
      applyError('Failed to fetch models index.');
      return null;
    }
    const data = await response.json();
    const rfm = {
      lastupdate: data.date,
      totalcount: data.total,
      characters: Object.keys(data.count),
      versions: Object.keys(data.versions),
      backgrounds: { __proto__: null } as unknown as Record<string, [string, string]>,
      backgroundcount: 0,
      models: data.versions,
      count: data.count,
    };
    for (let i = 0, version; i < rfm.versions.length; ++i) {
      version = rfm.versions[i];
      if (!rfm.models[version].BACKGROUND) continue;
      rfm.backgrounds['' + version] = rfm.models[version].BACKGROUND;
      Reflect.deleteProperty(rfm.models[version], 'BACKGROUND');
      ++rfm.backgroundcount;
    }
    const mdx = new ModelsIndex(rfm);
    console.log('Models index (unformatted):', structuredClone(data));
    console.log('Models index (reformatted):', structuredClone(rfm));
    console.log('Models index (latest):',      mdx);
    /** @todo This breaks the functional style of solid in a weird way so I wanna get rid of this sooner or later.  */
    main.classList = 'running';
    (globalThis as any).GenshinModels = mdx;
    return mdx;
  });

  return (<Suspense><Show when={mdx()}>
    <header><a target="_top" href="./#models">Genshin Model Archive</a></header>
    <Tabs mdx={mdx()!} />
  </Show></Suspense>);
}

render(Root, appDiv);
