import clickSfx1 from '../imports/universfield-mouse-click-351398.mp3';
import clickSfx2 from '../imports/universfield-computer-mouse-click-352734.mp3';
import clickSfx3 from '../imports/matthewvakaliuk73627-mouse-click-290204.mp3';
import dnaSfxSrc from '../imports/freesound_community-3-up-1-89190.mp3';
import geneSfxSrc from '../imports/freesound_community-success-1-6297.mp3';
import arenaMusicSrc from '../imports/06 - Arena.mp3';

class AudioPool {
  private pool: HTMLAudioElement[];
  private idx = 0;
  constructor(src: string, size: number, volume: number) {
    this.pool = Array.from({ length: size }, () => {
      const a = new Audio(src);
      a.volume = volume;
      return a;
    });
  }
  play() {
    const a = this.pool[this.idx];
    this.idx = (this.idx + 1) % this.pool.length;
    a.currentTime = 0;
    a.play().catch(() => {});
  }
}

let clickPools: AudioPool[] | null = null;
let dnaPool: AudioPool | null = null;
let geneAudio: HTMLAudioElement | null = null;
let arenaAudio: HTMLAudioElement | null = null;

export function playClick() {
  if (!clickPools) {
    clickPools = [
      new AudioPool(clickSfx1, 2, 0.55),
      new AudioPool(clickSfx2, 2, 0.55),
      new AudioPool(clickSfx3, 2, 0.55),
    ];
  }
  clickPools[Math.floor(Math.random() * clickPools.length)].play();
}

export function playDNA() {
  if (!dnaPool) dnaPool = new AudioPool(dnaSfxSrc, 5, 0.35);
  dnaPool.play();
}

export function playGeneEvolution() {
  if (!geneAudio) {
    geneAudio = new Audio(geneSfxSrc);
    geneAudio.volume = 0.75;
  }
  geneAudio.currentTime = 0;
  geneAudio.play().catch(() => {});
}

export function startArenaMusic() {
  if (arenaAudio) return;
  arenaAudio = new Audio(arenaMusicSrc);
  arenaAudio.loop = true;
  arenaAudio.volume = 0.45;
  arenaAudio.play().catch(() => {});
}

export function stopArenaMusic() {
  if (arenaAudio) {
    arenaAudio.pause();
    arenaAudio.src = '';
    arenaAudio = null;
  }
}
