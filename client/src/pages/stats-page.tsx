import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Loader2 } from "lucide-react";
import MainLayout from "@/layouts/main-layout";
import { useLanguage } from "@/hooks/use-language";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";

export default function StatsPage() {
  const { user, isLoading } = useAuth();
  const { translate } = useLanguage();

  // Query stats based on user role
  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: [`/api/stats/${user?.role}`],
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/auth" />;
  }

  return (
    <MainLayout>
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900">{translate("statistics")}</h1>
          <p className="text-neutral-500">
            {user.role === "teacher" 
              ? translate("view_class_performance") 
              : translate("view_your_performance")}
          </p>
        </div>
        
        {isStatsLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{translate("performance_overview")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg text-center text-neutral-600 py-12">
                  {translate("detailed_stats_coming_soon")}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>{translate("game_statistics")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg text-center text-neutral-600 py-12">
                  {translate("game_stats_coming_soon")}
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </MainLayout>
  );
}