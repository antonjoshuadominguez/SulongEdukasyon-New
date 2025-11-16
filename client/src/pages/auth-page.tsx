import AuthForm from "@/components/auth/auth-form";
import { useAuth } from "@/hooks/use-auth";
import { t } from "@/lib/translations";
import { Redirect } from "wouter";


export default function AuthPage() {
  const { user, isLoading } = useAuth();
  
  // Redirect to dashboard if already logged in
  if (!isLoading && user) {
    return <Redirect to="/dashboard" />;
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50 p-4">

      
      <div className="max-w-7xl w-full flex flex-col md:flex-row bg-white rounded-lg overflow-hidden shadow-xl">
        {/* Auth form section */}
        <div className="w-full md:w-1/2 p-8">
          <AuthForm />
        </div>
        
        {/* Hero section */}
        <div className="w-full md:w-1/2 bg-primary p-8 flex flex-col justify-center">
          <div className="max-w-lg mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Maligayang pagdating sa SulongEdukasyon
            </h1>
            <p className="text-white text-base mb-8">
              Isang platform ng pag-aaral na may larong pang-edukasyon para sa mga mag-aaral ng Grade 6 Araling Panlipunan
            </p>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-white flex items-center justify-center text-primary font-bold">
                  1
                </div>
                <p className="ml-3 text-white">
                  Puzzle ng Larawan: Isanib muli ang mga makasaysayang artifact at alamin ang kanilang kahalagahan
                </p>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-white flex items-center justify-center text-primary font-bold">
                  2
                </div>
                <p className="ml-3 text-white">
                  Paghahanap ng Pares: Hanapin ang mga pares ng makasaysayang larawan at tuklasin ang mga katotohanan
                </p>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-white flex items-center justify-center text-primary font-bold">
                  3
                </div>
                <p className="ml-3 text-white">
                  Hulaan ang Guhit: Makipagtulungan sa mga kaklase sa isang masayang larong pagguhit at paghula
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
