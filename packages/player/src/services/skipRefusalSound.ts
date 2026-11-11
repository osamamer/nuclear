export const playSkipRefusalSound = (): void => {
  if (
    typeof window === 'undefined' ||
    typeof window.AudioContext !== 'function'
  ) {
    return;
  }

  const audioContext = new window.AudioContext();
  const masterGain = audioContext.createGain();
  masterGain.gain.value = 0.12;
  masterGain.connect(audioContext.destination);

  const startAt = audioContext.currentTime;
  [185, 138].forEach((frequency, index) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const toneStart = startAt + index * 0.16;
    const toneEnd = toneStart + 0.12;

    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(frequency, toneStart);
    gain.gain.setValueAtTime(0.001, toneStart);
    gain.gain.exponentialRampToValueAtTime(0.8, toneStart + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, toneEnd);
    oscillator.connect(gain);
    gain.connect(masterGain);
    oscillator.start(toneStart);
    oscillator.stop(toneEnd);
  });

  window.setTimeout(() => void audioContext.close(), 500);
};
