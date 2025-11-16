import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Loader2 } from "lucide-react";
import MainLayout from "@/layouts/main-layout";
import TeacherDashboard from "@/components/teacher/dashboard";
import StudentDashboard from "@/components/student/dashboard";

export default function HomePage() {
  const { user, isLoading } = useAuth();

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
      {user.role === "teacher" ? <TeacherDashboard /> : <StudentDashboard />}
    </MainLayout>
  );
}
