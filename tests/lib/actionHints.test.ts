import { describe, expect, it } from 'vitest';
import { applyActionHint, deriveActionHint, enhanceActionHintsInSubtree } from '@/lib/actionHints';

describe('actionHints', () => {
  it('derives link hint from text', () => {
    const link = document.createElement('a');
    link.href = '/incidents';
    link.textContent = 'Incidents';

    expect(deriveActionHint(link)).toBe('Open Incidents');
  });

  it('derives button hint from aria label', () => {
    const button = document.createElement('button');
    button.setAttribute('aria-label', 'Create Incident');

    expect(deriveActionHint(button)).toBe('Activate Create Incident');
  });

  it('uses explicit data-action-help when provided', () => {
    const button = document.createElement('button');
    button.setAttribute('data-action-help', 'Create a new incident report');

    expect(deriveActionHint(button)).toBe('Create a new incident report');
  });

  it('applies title hints to clickable nodes in a subtree', () => {
    const wrapper = document.createElement('div');
    const button = document.createElement('button');
    button.textContent = 'Start Drill';
    wrapper.appendChild(button);

    enhanceActionHintsInSubtree(wrapper);

    expect(button.getAttribute('title')).toBe('Activate Start Drill');
  });

  it('does not overwrite existing title', () => {
    const button = document.createElement('button');
    button.textContent = 'Save';
    button.setAttribute('title', 'Custom help text');

    applyActionHint(button);

    expect(button.getAttribute('title')).toBe('Custom help text');
  });
});
