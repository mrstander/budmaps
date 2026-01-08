
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';

export default function ReportingPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Reporting</h1>
       <Card>
        <CardHeader>
          <CardTitle>Sales & Performance Reports</CardTitle>
          <CardDescription>
            Analyze your sales data and track your dispensary's performance over time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Reporting and analytics charts coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}
