import { AppLayout } from '@/components/layout/AppLayout';
import { HowToGuideContent } from '@/components/help/HowToGuideContent';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

const HelpGuide = () => {
  const { canAdministerUsers } = useAuth();

  return (
    <AppLayout>
      <div className="space-y-6">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>How-To Guide</CardTitle>
            <CardDescription>
              Step-by-step instructions for key workflows in Safety Guardian.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <HowToGuideContent canViewAdminTopics={canAdministerUsers} enableSearch />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default HelpGuide;
