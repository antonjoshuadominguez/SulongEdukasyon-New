import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Loader2 } from "lucide-react";
import MainLayout from "@/layouts/main-layout";
import { useLanguage } from "@/hooks/use-language";

export default function ClassPage() {
  const { user, isLoading } = useAuth();
  const { translate } = useLanguage();

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

  if (user.role !== "teacher") {
    return <Redirect to="/" />;
  }

  return (
    <MainLayout>
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900">{translate("my_class")}</h1>
          <p className="text-neutral-500">{translate("manage_your_class")}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-lg text-center text-neutral-600">
            {translate("class_page_coming_soon")}
          </p>
        </div>
      </div>
    </MainLayout>
  );
}