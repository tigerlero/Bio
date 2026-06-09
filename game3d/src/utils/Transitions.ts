export function fadeIn(duration = 300): Promise<void> {
  return new Promise(resolve => {
    let el = document.getElementById('fade-overlay');
    if (!el) {
      el = document.createElement('div');
      el.id = 'fade-overlay';
      el.style.cssText = 'position:fixed;inset:0;background:#000;z-index:999;pointer-events:none;opacity:1;transition:opacity 0s;';
      document.body.appendChild(el);
    }
    el.style.transition = 'none';
    el.style.opacity = '1';
    el.style.pointerEvents = 'none';
    el.offsetHeight; // force reflow
    requestAnimationFrame(() => {
      el!.style.transition = `opacity ${duration}ms ease`;
      el!.style.opacity = '0';
      setTimeout(resolve, duration);
    });
  });
}

export function fadeOut(duration = 300): Promise<void> {
  return new Promise(resolve => {
    let el = document.getElementById('fade-overlay');
    if (!el) {
      el = document.createElement('div');
      el.id = 'fade-overlay';
      el.style.cssText = 'position:fixed;inset:0;background:#000;z-index:999;pointer-events:none;opacity:0;transition:opacity 0s;';
      document.body.appendChild(el);
    }
    el.style.transition = 'none';
    el.style.opacity = '0';
    el.offsetHeight; // force reflow
    requestAnimationFrame(() => {
      el!.style.transition = `opacity ${duration}ms ease`;
      el!.style.opacity = '1';
      setTimeout(resolve, duration);
    });
  });
}
