
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';

export default function ReportingPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Global Reporting</h1>
       <Card>
        <CardHeader>
          <CardTitle>Platform Analytics</CardTitle>
          <CardDescription>
            Analyze sales data, user growth, and overall platform performance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Global reporting and analytics charts coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}

    