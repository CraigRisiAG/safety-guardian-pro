const CLICKABLE_SELECTOR = [
  'a[href]',
  'button',
  '[role="button"]',
  'input[type="button"]',
  'input[type="submit"]',
  'input[type="checkbox"]',
  'input[type="radio"]',
  'summary',
  '[data-action-help]',
].join(',');

const normalizeText = (value: string | null | undefined): string => {
  if (!value) {
    return '';
  }

  return value.replace(/\s+/g, ' ').trim();
};

const getAssociatedLabel = (element: HTMLElement): string => {
  const labelledBy = normalizeText(element.getAttribute('aria-label'));
  if (labelledBy) {
    return labelledBy;
  }

  const dataHelp = normalizeText(element.getAttribute('data-action-help'));
  if (dataHelp) {
    return dataHelp;
  }

  const elementText = normalizeText(element.textContent);
  if (elementText) {
    return elementText;
  }

  const htmlForId = element.getAttribute('id');
  if (htmlForId) {
    const associatedLabel = document.querySelector(`label[for="${htmlForId}"]`);
    const labelText = normalizeText(associatedLabel?.textContent);
    if (labelText) {
      return labelText;
    }
  }

  return '';
};

export const deriveActionHint = (element: HTMLElement): string | null => {
  const explicitHelp = normalizeText(element.getAttribute('data-action-help'));
  if (explicitHelp) {
    return explicitHelp;
  }

  const tagName = element.tagName.toLowerCase();
  const inputType = tagName === 'input' ? (element.getAttribute('type') ?? '').toLowerCase() : '';
  const label = getAssociatedLabel(element);

  if (tagName === 'a') {
    return label ? `Open ${label}` : 'Open this link';
  }

  if (inputType === 'checkbox' || inputType === 'radio') {
    return label ? `Toggle ${label}` : 'Toggle this option';
  }

  if (inputType === 'submit') {
    return label ? `Submit ${label}` : 'Submit this form';
  }

  if (tagName === 'button' || inputType === 'button' || tagName === 'summary' || element.getAttribute('role') === 'button') {
    return label ? `Activate ${label}` : 'Activate this control';
  }

  return label ? `Select ${label}` : null;
};

export const applyActionHint = (element: HTMLElement) => {
  if (!element.matches(CLICKABLE_SELECTOR)) {
    return;
  }

  if (element.hasAttribute('title')) {
    return;
  }

  const hint = deriveActionHint(element);
  if (!hint) {
    return;
  }

  element.setAttribute('title', hint);
};

export const enhanceActionHintsInSubtree = (root: ParentNode) => {
  if (root instanceof HTMLElement && root.matches(CLICKABLE_SELECTOR)) {
    applyActionHint(root);
  }

  root.querySelectorAll<HTMLElement>(CLICKABLE_SELECTOR).forEach((element) => {
    applyActionHint(element);
  });
};
