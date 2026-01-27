// Simple click sound utility
let clickAudio: HTMLAudioElement | null = null;

export const playClickSound = () => {
  try {
    // Create a subtle click sound using Web Audio API
    const audioContext =
      new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Configure sound
    oscillator.type = "sine";
    oscillator.frequency.value = 800; // Higher frequency for a crisp click

    // Volume envelope for a short click
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.05,
    );

    // Play for 50ms
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.05);
  } catch (error) {
    // Silently fail if audio isn't supported
    console.debug("Click sound not available");
  }
};

export const scrollToTop = (element?: HTMLElement | null) => {
  const target = element || window;
  if (target instanceof Window) {
    target.scrollTo({ top: 0, behavior: "smooth" });
  } else {
    target.scrollTo({ top: 0, behavior: "smooth" });
  }
};
