/**
 * Fullscreen API helper with cross-browser compatibility and safety fallbacks.
 */

export async function toggleElementFullscreen(element: HTMLElement | null): Promise<boolean> {
  if (!element || typeof document === 'undefined') {
    return false;
  }

  try {
    const isFullscreen =
      document.fullscreenElement ||
      (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement ||
      (document as unknown as { mozFullScreenElement?: Element }).mozFullScreenElement ||
      (document as unknown as { msFullscreenElement?: Element }).msFullscreenElement;

    if (!isFullscreen) {
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if ((element as unknown as { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen) {
        await (element as unknown as { webkitRequestFullscreen: () => Promise<void> }).webkitRequestFullscreen();
      } else if ((element as unknown as { msRequestFullscreen?: () => Promise<void> }).msRequestFullscreen) {
        await (element as unknown as { msRequestFullscreen: () => Promise<void> }).msRequestFullscreen();
      }
      return true;
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as unknown as { webkitExitFullscreen?: () => Promise<void> }).webkitExitFullscreen) {
        await (document as unknown as { webkitExitFullscreen: () => Promise<void> }).webkitExitFullscreen();
      } else if ((document as unknown as { msExitFullscreen?: () => Promise<void> }).msExitFullscreen) {
        await (document as unknown as { msExitFullscreen: () => Promise<void> }).msExitFullscreen();
      }
      return false;
    }
  } catch (err) {
    console.warn('[Fullscreen] Toggle failed:', err);
    return false;
  }
}

export function isElementFullscreen(element: HTMLElement | null): boolean {
  if (!element || typeof document === 'undefined') return false;
  return document.fullscreenElement === element;
}
