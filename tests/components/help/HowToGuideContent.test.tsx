import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HowToGuideContent } from '@/components/help/HowToGuideContent';

describe('HowToGuideContent', () => {
  it('hides admin topics for non-admin users', () => {
    render(<HowToGuideContent canViewAdminTopics={false} enableSearch />);

    expect(screen.queryByText(/Admin: User Access and Permissions/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Report and Track Incidents/i)).toBeInTheDocument();
  });

  it('shows admin topics for administrators', () => {
    render(<HowToGuideContent canViewAdminTopics enableSearch />);

    expect(screen.getByText(/Admin: User Access and Permissions/i)).toBeInTheDocument();
    expect(screen.getByText(/Admin: Configure System Languages/i)).toBeInTheDocument();
  });

  it('filters topics using search query', () => {
    render(<HowToGuideContent canViewAdminTopics enableSearch />);

    fireEvent.change(screen.getByLabelText(/Search help topics/i), {
      target: { value: 'personnel' },
    });

    expect(screen.getByText(/Manage Personnel and Assistance Flags/i)).toBeInTheDocument();
    expect(screen.queryByText(/Run Drill Activities/i)).not.toBeInTheDocument();
  });
});
