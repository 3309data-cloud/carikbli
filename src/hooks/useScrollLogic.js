import { useRef, useCallback } from "react";

export function useScrollLogic() {
  const mainRef = useRef(null);
  const resultCardRef = useRef(null);
  const typingRef = useRef(null);
  const verifikasiRef = useRef(null);
  const isScrolling = useRef(false);

  const slowScrollTo = useCallback((targetScrollTop) => {
    if (!mainRef.current) return;

    const start = mainRef.current.scrollTop;
    const distance = targetScrollTop - start;
    if (Math.abs(distance) < 5) return;

    const duration = 1200;
    let startTime = null;
    isScrolling.current = true;

    const stopScroll = () => { isScrolling.current = false; };
    mainRef.current.addEventListener('touchstart', stopScroll, { once: true });
    mainRef.current.addEventListener('wheel', stopScroll, { once: true });

    const animation = (currentTime) => {
      if (!isScrolling.current) return;
      if (startTime === null) startTime = currentTime;

      const timeElapsed = currentTime - startTime;
      const progress = Math.min(timeElapsed / duration, 1);

      // Logika EaseInOut yang Anda gunakan
      const ease = progress < 0.5 
        ? 2 * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      mainRef.current.scrollTop = start + distance * ease;

      if (timeElapsed < duration) {
        requestAnimationFrame(animation);
      } else {
        isScrolling.current = false;
        mainRef.current.removeEventListener('touchstart', stopScroll);
        mainRef.current.removeEventListener('wheel', stopScroll);
      }
    };
    requestAnimationFrame(animation);
  }, []);

  const scrollToElement = useCallback((el) => {
    if (!mainRef.current || !el) return;
    const containerTop = mainRef.current.getBoundingClientRect().top;
    const elTop = el.getBoundingClientRect().top;
    // Jarak aman 16px dari atas agar tidak mepet header
    const target = mainRef.current.scrollTop + (elTop - containerTop) - 16;
    slowScrollTo(target);
  }, [slowScrollTo]);

  return { mainRef, resultCardRef, typingRef, verifikasiRef, scrollToElement, slowScrollTo };
}