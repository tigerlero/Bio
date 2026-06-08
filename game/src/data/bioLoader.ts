import type { BioData } from './bio';
import raw from './bio.json';

let bioData: BioData | null = null;

export function loadBio(): BioData {
  if (!bioData) {
    bioData = raw as BioData;
  }
  return bioData;
}

export function getBio(): BioData {
  if (!bioData) throw new Error('Bio not loaded. Call loadBio() first.');
  return bioData;
}
