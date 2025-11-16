import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import MainLayout from "@/layouts/main-layout";
import { Loader2, Trophy } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import StudentLeaderboard from "@/components/student-leaderboard";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function StudentLeaderboardPage() {
  const { user, isLoading } = useAuth();
  const { translate } = useLanguage();
  const [activeGameType, setActiveGameType] = useState<string>("picture_puzzle");

  const gameTypes = [
    { id: "picture_puzzle", name: translate("Picture Puzzle") },
    { id: "picture_matching", name: translate("Picture Matching") },
    { id: "true_or_false", name: translate("True or False") },
    { id: "explain_image", name: translate("Explain Image") },
    { id: "fill_blanks", name: translate("Fill Blanks") },
    { id: "arrange_timeline", name: translate("Arrange Timeline") },
    { id: "tama_ang_ayos", name: translate("Tama ang Ayos") }
  ];

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

  if (user.role !== "student") {
    return <Redirect to="/" />;
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <div className="flex items-center gap-2 mb-6">
          <Trophy className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold">{translate("Leaderboards")}</h1>
        </div>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{translate("Game Leaderboards")}</CardTitle>
            <CardDescription>
              {translate("View the top scores for each game type")}
            </CardDescription>
          </CardHeader>
        </Card>
        
        <Tabs defaultValue="picture_puzzle" value={activeGameType} onValueChange={setActiveGameType} className="w-full">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 mb-6">
            {gameTypes.map(gameType => (
              <TabsTrigger key={gameType.id} value={gameType.id}>
                {gameType.name}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {gameTypes.map(gameType => (
            <TabsContent key={gameType.id} value={gameType.id}>
              <StudentLeaderboard 
                gameType={gameType.id as any} 
                limit={15}
              />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </MainLayout>
  );
}