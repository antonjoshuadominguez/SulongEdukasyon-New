import MainLayout from "@/layouts/main-layout";
import StudentDashboard from "@/components/student/dashboard";

export default function StudentHome() {
  return (
    <MainLayout>
      <StudentDashboard />
    </MainLayout>
  );
}
