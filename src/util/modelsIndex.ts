'use strict';

type VersionT = string | number;
type BackgroundT = {
  downloadurl: string,
  originalurl: string,
  downloadfile: string,
};
type CharacterT = {
  count: number,
  name: string,
  version: VersionT,
  downloadfile: string,
  downloadurl: string,
  originalurl: string,
  notes: string,
};

class ModelsIndex {
  private _$: {
    lastupdate: number,
    totalcount: number,
    characters: string[],
    versions: string[],
    backgrounds: Record<string, [string, string]>,
    backgroundcount: number,
    models: Record<string, Record<string, [string, string, string]>>,
    count: Record<string, number>,
  };

  public constructor(data: ModelsIndex['_$']) {
    this._$ = data;
  }

  public totalCharacterCount(): number {
    return this._$.totalcount;
  }
  public totalBackgroundCount(): number {
    return this._$.backgroundcount;
  }

  public lastUpdate(): number {
    return this._$.lastupdate;
  }
  public hasVersion(version: VersionT): boolean {
    return this._$.versions.indexOf('' + version) !== -1;
  }

  public hasBackground(version: string | number): boolean {
    return Object.prototype.hasOwnProperty.call(this._$.backgrounds, '' + version);
  }
  public getBackground(version: VersionT): BackgroundT | null {
    if (!this.hasBackground(version)) return null;
    version = '' + version;
    return {
      downloadurl: `ver/${version}/${this._$.backgrounds[version][0]}`,
      originalurl: this._$.backgrounds[version][1],
      downloadfile: this._$.backgrounds[version][0],
    };
  }

  public hasCharacter(character: string, version?: VersionT | null): boolean {
    if (!isNaN(+(version ?? NaN))) {
      if (!this.hasVersion(version as VersionT)) return false;
      return Object.prototype.hasOwnProperty.call(this._$.models['' + version], character);
    }
    return this._$.characters.indexOf(character) !== -1;
  }
  public getCharacterCount(character?: string | null): number {
    if ((character ?? '').trim() === '') {
      return this._$.totalcount;
    }
    if (!this.hasCharacter(character as string)) return 0;
    return this._$.count[character as string];
  }
  public getCharacter(character: string, version?: VersionT | null, skipCount?: boolean | null): CharacterT | null {
    version = '' + version;
    if (!this.hasCharacter(character, version)) return null;
    const data: Partial<CharacterT> = {
      count: -1,
    };
    if (!skipCount) data.count = this.getCharacterCount(character);
    if (isNaN(+version)) {
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
    return data as CharacterT;
  }

  public versionList(): string[] {
    return this._$.versions.slice(0, Infinity);
  }
  public characterList(): string[] {
    return this._$.characters.slice(0, Infinity);
  }
}
export default ModelsIndex;
