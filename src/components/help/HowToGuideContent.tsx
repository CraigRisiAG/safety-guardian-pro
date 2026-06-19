import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';

interface HowToSection {
  title: string;
  steps: string[];
  keywords?: string[];
  adminOnly?: boolean;
}

export const HOW_TO_SECTIONS: HowToSection[] = [
  {
    title: 'What the App Does',
    steps: [
      'Safety Guardian helps teams prevent, respond to, and recover from workplace safety incidents.',
      'It combines incident management, drill coordination, attendance check-ins, compliance tracking, and readiness reporting in one place.',
      'The main goal is faster emergency response, better visibility, and improved safety outcomes over time.',
    ],
    keywords: ['overview', 'what is this app', 'purpose', 'safety guardian'],
  },
  {
    title: 'Getting Started and Navigation',
    steps: [
      'Sign in with your account credentials.',
      'Use the left sidebar to move between Dashboard, Incidents, Drills, Check-In, Admin, and Help.',
      'Use your avatar menu (top-right) for account actions, language preference, and support tools.',
      'Hover over clickable controls to see small action hints that describe what they do.',
    ],
    keywords: ['navigation', 'sidebar', 'menu', 'login'],
  },
  {
    title: 'Report and Track Incidents',
    steps: [
      'Open the Incidents page from the sidebar.',
      'Select the option to create/report a new incident.',
      'Complete required details (type, severity, location, summary, and assigned responders).',
      'Save the incident and monitor status updates in the incident list.',
      'Use filters/search to quickly find open, escalated, or resolved incidents.',
      'Open an incident to update ownership, notes, and final resolution details.',
    ],
    keywords: ['incident', 'report', 'severity', 'status', 'responders'],
  },
  {
    title: 'Run Drill Activities',
    steps: [
      'Go to Drills and create or start a scheduled drill.',
      'Set target buildings/floors/areas and confirm participants.',
      'Start the drill and monitor participation/response progress in real time.',
      'End the drill when complete and review outcomes and follow-up actions.',
      'Review drill timelines to identify bottlenecks and improve evacuation readiness.',
    ],
    keywords: ['drill', 'evacuation', 'schedule', 'participants'],
  },
  {
    title: 'Use Safety Check-In During Active Drills',
    steps: [
      'Open Safety Check-In when a drill is active.',
      'Mark personnel status (safe / needs assistance / not yet checked in).',
      'Prioritize users flagged for additional assistance.',
      'Review pending check-ins before closing drill operations.',
      'Escalate unresolved check-ins to responders before marking the event complete.',
    ],
    keywords: ['check-in', 'safe', 'assistance', 'pending'],
  },
  {
    title: 'Drill Check-In Status Meaning',
    steps: [
      'Safe means the person has been accounted for and does not require immediate support.',
      'Needs Assistance means the person is accounted for but requires priority help, guidance, or evacuation support.',
      'Not Yet Checked In means there is no confirmed status yet; treat this as a follow-up priority.',
      'Use floor/area context to direct responders quickly to unresolved or high-risk cases.',
    ],
    keywords: ['drill check-in', 'status meaning', 'safe', 'needs assistance', 'not checked in'],
  },
  {
    title: 'Manage Personnel and Assistance Flags',
    steps: [
      'Open Personnel Directory from the dashboard/personnel tools.',
      'Add or edit a person and complete profile fields.',
      "Set 'Requires Additional Assistance' for anyone needing emergency support.",
      'Save changes and verify the assistance badge appears in operational views.',
      'Use bulk upload templates for faster onboarding of large personnel lists.',
    ],
    keywords: ['personnel', 'directory', 'assistance', 'bulk upload'],
  },
  {
    title: 'Set Your Language Preference',
    steps: [
      'Users: open avatar menu > Language Preference to set your own UI language.',
      'Choose your language and save to apply it to your account session.',
      'If your language is unavailable, contact an admin to enable it.',
    ],
    keywords: ['language', 'preference', 'translation'],
  },
  {
    title: 'How Customization Works',
    steps: [
      'Administrators can tailor system behavior through Admin settings, including language support, permissions, and operational configuration.',
      'User-level customization focuses on personal preferences such as interface language and account-level options.',
      'Organization-level customization should be reviewed periodically so roles, building scopes, and workflows remain accurate.',
      'Before major changes, confirm who is impacted and communicate updates to operational teams.',
    ],
    keywords: ['customization', 'settings', 'configuration', 'admin settings', 'preferences'],
  },
  {
    title: 'Reporting Information and What It Means',
    steps: [
      'Use dashboard summary cards to quickly identify open incidents, upcoming drills, and key compliance indicators.',
      'Incident trends help identify recurring hazards, hotspots, and response-time improvement opportunities.',
      'Drill participation and check-in completion indicate readiness, accountability, and escalation effectiveness.',
      'Compliance and overdue checks show where preventive controls may be weakening and need intervention.',
      'Use reports as decision-support: prioritize high-risk gaps first, then track whether actions improve outcomes over time.',
    ],
    keywords: ['reporting', 'metrics', 'dashboard', 'compliance', 'trends', 'meaning'],
  },
  {
    title: 'Find Answers Quickly',
    steps: [
      'Use the search field at the top of this page/dialog to filter help topics by keyword.',
      'Try words like incident, drill, language, personnel, admin, or notifications.',
      'Open the Help Guide from the left sidebar for full-screen browsing.',
    ],
    keywords: ['search', 'help', 'guide', 'keywords'],
  },
  {
    title: 'Admin: Configure System Languages',
    steps: [
      'Open Admin > Languages.',
      'Enable/disable supported languages based on your organization requirements.',
      'Set a default fallback language for all users.',
      'Keep at least one language enabled at all times.',
    ],
    keywords: ['admin', 'languages', 'default', 'supported'],
    adminOnly: true,
  },
  {
    title: 'Admin: User Access and Permissions',
    steps: [
      'Open Admin and navigate to user/permission management sections.',
      'Assign roles and scope (building/floor/area) according to responsibilities.',
      'Use reset password, MFA settings, and impersonation tools for support workflows.',
      'Review changes and confirm users can access only their allowed sections.',
    ],
    keywords: ['admin', 'roles', 'permissions', 'mfa', 'impersonation'],
    adminOnly: true,
  },
  {
    title: 'Admin: Compliance and Audit Readiness',
    steps: [
      'Use Compliance sections in Admin to manage recurring checks and assignments.',
      'Review overdue checks and unresolved incidents regularly.',
      'Use system logs and notification tools to verify communication and traceability.',
      'Capture improvement actions after drills and incidents for continuous safety maturity.',
    ],
    keywords: ['admin', 'compliance', 'audit', 'logs', 'notifications'],
    adminOnly: true,
  },
];

interface HowToGuideContentProps {
  compact?: boolean;
  canViewAdminTopics?: boolean;
  enableSearch?: boolean;
}

export function HowToGuideContent({
  compact = false,
  canViewAdminTopics = false,
  enableSearch = true,
}: HowToGuideContentProps) {
  const [query, setQuery] = useState('');

  const quickStartItems = useMemo(() => {
    const baseItems = [
      'Open Dashboard first to review active incidents, drills, and compliance status.',
      'Use Incidents to report safety events quickly with severity and location details.',
      'During drills, move to Safety Check-In to account for personnel and flag assistance needs.',
      'Use Help search to find guidance fast by keywords like incidents, drill, language, or personnel.',
    ];

    if (canViewAdminTopics) {
      return [
        ...baseItems,
        'Admin: Review roles, permissions, and language support settings before onboarding new teams.',
      ];
    }

    return [
      ...baseItems,
      'Set your preferred language from the avatar menu for a personalized interface experience.',
    ];
  }, [canViewAdminTopics]);

  const visibleSections = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const scopedSections = HOW_TO_SECTIONS.filter((section) => canViewAdminTopics || !section.adminOnly);

    if (!normalizedQuery) {
      return scopedSections;
    }

    return scopedSections.filter((section) => {
      const matchesTitle = section.title.toLowerCase().includes(normalizedQuery);
      const matchesStep = section.steps.some((step) => step.toLowerCase().includes(normalizedQuery));
      const matchesKeywords = section.keywords?.some((keyword) => keyword.toLowerCase().includes(normalizedQuery));
      return matchesTitle || matchesStep || !!matchesKeywords;
    });
  }, [canViewAdminTopics, query]);

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-muted/30 p-4 space-y-2">
        <h3 className="text-sm font-semibold">Quick Start</h3>
        <ol className="list-decimal pl-5 space-y-1 text-sm text-muted-foreground">
          {quickStartItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </div>

      {enableSearch && (
        <div className="space-y-2">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search help topics (for example: incidents, drills, language, admin)"
            aria-label="Search help topics"
          />
          <p className="text-xs text-muted-foreground">
            {visibleSections.length} topic{visibleSections.length === 1 ? '' : 's'} found
          </p>
        </div>
      )}

      <div className={compact ? 'max-h-[60vh] overflow-y-auto pr-2 space-y-4' : 'space-y-4'}>
        {visibleSections.map((section) => (
        <div key={section.title} className="space-y-2 border rounded-md p-3">
          <h4 className="text-sm font-semibold">
            {section.title}
            {section.adminOnly && <span className="ml-2 text-xs text-muted-foreground">(Admin)</span>}
          </h4>
          <ol className="list-decimal pl-5 space-y-1 text-sm text-muted-foreground">
            {section.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
        ))}
        {visibleSections.length === 0 && (
          <div className="border rounded-md p-3 text-sm text-muted-foreground">
            No topics matched your search. Try broader keywords like drill, incidents, personnel, or language.
          </div>
        )}
      </div>
    </div>
  );
}
