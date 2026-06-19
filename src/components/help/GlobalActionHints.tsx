import { useEffect } from 'react';
import { applyActionHint, enhanceActionHintsInSubtree } from '@/lib/actionHints';

export function GlobalActionHints() {
  useEffect(() => {
    enhanceActionHintsInSubtree(document.body);

    const onPointerEnter = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      applyActionHint(target);
    };

    document.addEventListener('mouseover', onPointerEnter, true);
    document.addEventListener('focusin', onPointerEnter, true);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) {
            return;
          }

          enhanceActionHintsInSubtree(node);
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener('mouseover', onPointerEnter, true);
      document.removeEventListener('focusin', onPointerEnter, true);
      observer.disconnect();
    };
  }, []);

  return null;
}
