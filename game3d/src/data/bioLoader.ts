import type { BioData } from './bio';
import raw from './bio.json';

export function loadBio(): BioData {
  return raw as BioData;
}

let _bio: BioData | null = null;
export function getBio(): BioData {
  if (!_bio) _bio = loadBio();
  return _bio;
}
