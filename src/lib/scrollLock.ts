// Общий ref-counted scroll-lock для модалок.
//
// v2: раньше лок делался через position:fixed + top:-scrollY + window.scrollTo
// при разлоке. Это ломалось в паре с framer-motion: layout/layoutId-анимации
// (даже с duration:0) делают реальный getBoundingClientRect-measurement, а
// framer's projection-система при этом учитывает fixed-позиционированных
// предков и корректирует смещение — на стыке с нашим искусственным
// top:-scrollY это давало один кадр рассинхрона: видимый прыжок страницы и
// "полоску" снизу.
//
// Теперь лочим проще: overflow:hidden на body + компенсация ширины
// скроллбара через padding-right, БЕЗ смещения документа и БЕЗ scrollTo.
// Страница физически никуда не двигается — значит framer видит настоящие,
// неискажённые координаты, и прыгать нечему.

let lockCount = 0;
let savedOverflow = '';

export function lockBodyScroll(): () => void {
  // Mobile only body lock as requested
  if (typeof window === 'undefined' || window.innerWidth >= 768) {
    return () => {};
  }

  if (lockCount === 0) {
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }

  lockCount++;

  let released = false;

  return () => {
    if (released) return; // защита от двойного вызова cleanup
    released = true;

    lockCount = Math.max(0, lockCount - 1);

    if (lockCount === 0) {
      document.body.style.overflow = savedOverflow;
    }
  };
}
