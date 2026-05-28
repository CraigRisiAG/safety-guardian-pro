import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EmergencyChat from '@/pages/EmergencyChat';

const mockUseAuth = vi.fn();
const mockUseDrillStatus = vi.fn();
const mockLoadMessages = vi.fn();
const mockAddMessage = vi.fn();
const mockToastError = vi.fn();

vi.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/hooks/useDrillStatus', () => ({
  useDrillStatus: () => mockUseDrillStatus(),
}));

vi.mock('@/lib/chatStorage', () => ({
  CHAT_MESSAGES_UPDATED_EVENT: 'safeguard_chat_messages_updated',
  loadChatMessagesFromStorage: () => mockLoadMessages(),
  addChatMessageToStorage: (...args: unknown[]) => mockAddMessage(...args),
  getDirectConversationId: (a: string, b: string) => ['direct', ...[a, b].sort()].join(':'),
}));

vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

describe('EmergencyChat page', () => {
  beforeEach(() => {
    mockLoadMessages.mockReturnValue([]);
    mockAddMessage.mockReset();
    mockToastError.mockReset();

    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-1',
        name: 'User One',
        email: 'user.one@example.com',
        role: 'user',
      },
      systemUsers: [
        {
          id: 'user-1',
          name: 'User One',
          email: 'user.one@example.com',
          role: 'user',
        },
        {
          id: 'user-2',
          name: 'User Two',
          email: 'user.two@example.com',
          role: 'admin',
        },
      ],
    });

    mockUseDrillStatus.mockReturnValue({
      activeDrill: null,
    });
  });

  it('renders emergency channel by default', () => {
    render(<EmergencyChat />);

    expect(screen.getByText('Emergency Chat')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Emergency Channel' })).toBeInTheDocument();
  });

  it('sends a direct message to selected user', () => {
    render(<EmergencyChat />);

    fireEvent.click(screen.getByRole('button', { name: 'Direct Messages' }));
    fireEvent.change(screen.getByLabelText('Message'), {
      target: { value: 'Please confirm your floor status' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send Message' }));

    expect(mockAddMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        context: 'direct',
        recipientUserId: 'user-2',
        message: 'Please confirm your floor status',
      }),
    );
  });

  it('supports drill channel when there is an active drill', () => {
    mockUseDrillStatus.mockReturnValue({
      activeDrill: {
        id: 'drill-1',
        type: 'fire',
        status: 'active',
        location: {
          buildingId: 'building-1',
          floorIds: ['floor-1'],
          areaIds: ['area-1'],
        },
        initiatedBy: 'System Admin',
      },
    });

    render(<EmergencyChat />);

    fireEvent.click(screen.getByRole('button', { name: 'Drill Channel' }));
    fireEvent.change(screen.getByLabelText('Message'), {
      target: { value: 'Evacuation route B is clear' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send Message' }));

    expect(mockAddMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        context: 'drill',
        conversationId: 'drill:drill-1',
        drillId: 'drill-1',
      }),
    );
  });
});
