// Simple click sound utility
import { RefObject } from "react";

let clickAudio: HTMLAudioElement | null = null;

export const playClickSound = () => {
  try {
    const AudioContextClass = window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = "sine";
    oscillator.frequency.value = 800;

    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.05,
    );

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.05);
  } catch (error) {
    console.debug("Click sound not available");
  }
};

export const scrollToTop = (element?: HTMLElement | null) => {
  if (!element) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  element.scrollTo({ top: 0, behavior: "smooth" });
};

/**
 * Scrolls a container to the top and optionally focuses the first interactive field.
 * Improved to ensure the container is properly framed at the top of the viewport.
 * Automatically handles internal scrollable areas within the container.
 */
export const scrollToFormStart = (
  containerInput: HTMLElement | RefObject<HTMLElement> | null,
  focus: boolean = true,
  retryCount: number = 0,
) => {
  // Resolve the container from either RefObject or raw element
  const container = containerInput && "current" in containerInput
    ? containerInput.current
    : containerInput as HTMLElement;

  if (!container) {
    if (retryCount < 3) {
      setTimeout(() => {
        scrollToFormStart(containerInput, focus, retryCount + 1);
      }, 100);
    }
    return;
  }

  const performAction = () => {
    if (!container) return;

    // 1. Framework: Align the entire form/modal container with the top of the viewport
    try {
      container.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (e) {
      // Fallback
      const rect = container.getBoundingClientRect();
      const scrollTop = window.pageYOffset ||
        document.documentElement.scrollTop;
      window.scrollTo({
        top: rect.top + scrollTop - 20, // Leave a tiny 20px gap for aesthetics
        behavior: "smooth",
      });
    }

    // 2. Content: Reset internal scroll for the container OR its first scrollable child
    // This handles the "flex flex-col" pattern where the shell is fixed but the child overflows.
    const findAndScroll = (el: HTMLElement) => {
      // If the element itself is scrollable
      if (el.scrollHeight > el.clientHeight) {
        el.scrollTo({ top: 0, behavior: "smooth" });
        return true;
      }
      // If not, check its immediate children (common for our modal patterns)
      const children = Array.from(el.children) as HTMLElement[];
      for (const child of children) {
        if (child.scrollHeight > child.clientHeight) {
          child.scrollTo({ top: 0, behavior: "smooth" });
          return true;
        }
      }
      return false;
    };

    findAndScroll(container);

    // 3. Focus: Target the first field
    if (focus) {
      setTimeout(() => {
        const firstInput = container.querySelector(
          'input:not([type="hidden"]):not([disabled]):not([readonly]), textarea:not([disabled]):not([readonly]), select:not([disabled]), [autofocus]',
        ) as HTMLElement;

        if (firstInput) {
          firstInput.focus({ preventScroll: true });

          if (document.activeElement !== firstInput) {
            firstInput.focus();
          }
        }
      }, 400);
    }
  };

  // Execution delay to allow modal transitions to settle
  setTimeout(performAction, 200);
};
