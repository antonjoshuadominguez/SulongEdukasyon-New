import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/use-language';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Trash2, UserX, Users, Image } from "lucide-react";
import ManageMatchingImages from "./manage-matching-images";

// Create a schema for form validation
const manageLobbySchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().optional(),
  status: z.enum(["active", "scheduled", "completed"]),
  startTime: z.string().optional(),
});

type ManageLobbyFormValues = z.infer<typeof manageLobbySchema>;

interface ManageLobbyModalProps {
  isOpen: boolean;
  onClose: () => void;
  lobbyId: number;
}

export default function ManageLobbyModal({ isOpen, onClose, lobbyId }: ManageLobbyModalProps) {
  const { translate } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("details");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  
  // Fetch the lobby details
  const { data: lobby, isLoading: isLoadingLobby } = useQuery({
    queryKey: ['/api/teacher/lobbies', lobbyId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/teacher/lobbies/${lobbyId}`);
      return await res.json();
    },
    enabled: isOpen && lobbyId > 0
  });
  
  // Fetch the lobby participants
  const { data: participants, isLoading: isLoadingParticipants } = useQuery({
    queryKey: ['/api/teacher/lobbies/participants', lobbyId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/teacher/lobbies/${lobbyId}/participants`);
      return await res.json();
    },
    enabled: isOpen && lobbyId > 0 && activeTab === "participants"
  });
  
  // Form setup
  const form = useForm<ManageLobbyFormValues>({
    resolver: zodResolver(manageLobbySchema),
    defaultValues: {
      name: "",
      description: "",
      status: "active"
    }
  });
  
  // Update form values when lobby data is loaded
  useEffect(() => {
    if (lobby) {
      // Format startTime as a local datetime-local string if it exists
      let formattedStartTime = "";
      if (lobby.startTime) {
        const date = new Date(lobby.startTime);
        formattedStartTime = new Date(date.getTime() - (date.getTimezoneOffset() * 60000))
          .toISOString()
          .slice(0, 16); // Format as YYYY-MM-DDTHH:MM
      }
      
      form.reset({
        name: lobby.name,
        description: lobby.description || "",
        status: lobby.status,
        startTime: formattedStartTime
      });
    }
  }, [lobby, form]);
  
  // Mutation for updating a lobby
  const updateLobbyMutation = useMutation({
    mutationFn: async (data: ManageLobbyFormValues) => {
      console.log("Updating lobby with data:", data);
      try {
        const res = await apiRequest('PATCH', `/api/teacher/lobbies/${lobbyId}`, data);
        if (!res.ok) {
          const errorText = await res.text();
          console.error("API response error:", errorText);
          throw new Error(`Failed to update lobby: ${errorText}`);
        }
        return await res.json();
      } catch (error) {
        console.error("Error updating lobby:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/teacher/lobbies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/teacher/lobbies', lobbyId] });
      
      // Refresh the lobby data
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['/api/teacher/lobbies', lobbyId] });
      }, 300);
      
      toast({
        title: translate("Lobby updated"),
        description: translate("Your game lobby has been updated successfully"),
      });
    },
    onError: (error: Error) => {
      console.error("Update error:", error);
      toast({
        title: translate("Failed to update lobby"),
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Mutation for deleting a lobby
  const deleteLobbyMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('DELETE', `/api/teacher/lobbies/${lobbyId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/teacher/lobbies'] });
      toast({
        title: translate("Lobby deleted"),
        description: translate("Your game lobby has been deleted successfully"),
      });
      setConfirmDeleteOpen(false);
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: translate("Failed to delete lobby"),
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Mutation for removing a participant
  const removeParticipantMutation = useMutation({
    mutationFn: async (participantId: number) => {
      await apiRequest('DELETE', `/api/teacher/lobbies/${lobbyId}/participants/${participantId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/teacher/lobbies/participants', lobbyId] });
      toast({
        title: translate("Participant removed"),
        description: translate("The participant has been removed from the game lobby"),
      });
    },
    onError: (error: Error) => {
      toast({
        title: translate("Failed to remove participant"),
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Form submission handler
  const onSubmit = (values: ManageLobbyFormValues) => {
    updateLobbyMutation.mutate(values);
  };
  
  const handleDelete = () => {
    deleteLobbyMutation.mutate();
  };
  
  const handleRemoveParticipant = (participantId: number) => {
    removeParticipantMutation.mutate(participantId);
  };
  
  // Format game type display
  const formatGameType = (type: string) => {
    switch (type) {
      case 'picture_puzzle':
        return translate('Picture Puzzle');
      case 'picture_matching':
        return translate('Picture Matching');
      case 'true_or_false':
        return translate('True or False');
      case 'explain_image':
        return translate('Explain Image');
      case 'fill_blanks':
        return translate('Fill Blanks');
      case 'arrange_timeline':
        return translate('Arrange Timeline');
      case 'tama_ang_ayos':
        return translate('Tama ang Ayos');
      default:
        return type;
    }
  };
  
  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{translate("Manage Game Lobby")}</DialogTitle>
            <DialogDescription>
              {translate("Modify your game lobby settings, view participants, and manage the game.")}
            </DialogDescription>
          </DialogHeader>
          
          {isLoadingLobby ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="details">{translate("Details")}</TabsTrigger>
                <TabsTrigger value="participants">
                  {translate("Students")} {participants?.length > 0 && 
                    <Badge variant="secondary" className="ml-2">{participants.length}</Badge>
                  }
                </TabsTrigger>
                {/* Hide all game management tabs for now */}
              </TabsList>
              
              <TabsContent value="details">
                {lobby && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Badge>{translate("Code")}: {lobby.lobbyCode}</Badge>
                      <Badge variant="secondary">{formatGameType(lobby.gameType)}</Badge>
                      <Badge variant={
                        lobby.status === 'active' ? 'default' : 
                        lobby.status === 'completed' ? 'secondary' : 
                        'outline'
                      }>
                        {translate(lobby.status.charAt(0).toUpperCase() + lobby.status.slice(1))}
                      </Badge>
                    </div>
                    
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{translate("Lobby Name")}</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder={translate("Enter a name for your game lobby")} 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{translate("Description")}</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder={translate("Provide additional details about this game lobby")} 
                                  {...field} 
                                  value={field.value || ''}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="status"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{translate("Status")}</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder={translate("Select a status")} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="active">
                                    {translate("Active")}
                                  </SelectItem>
                                  <SelectItem value="completed">
                                    {translate("Completed")}
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                {translate("Change the status of your game lobby")}
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />


                        
                        <DialogFooter className="flex justify-between">
                          <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" type="button">
                                <Trash2 className="h-4 w-4 mr-2" />
                                {translate("Delete Lobby")}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{translate("Are you sure?")}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {translate("This action cannot be undone. This will permanently delete the game lobby and remove all associated data.")}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{translate("Cancel")}</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={handleDelete}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {deleteLobbyMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                  {translate("Delete")}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          
                          <Button type="submit" disabled={updateLobbyMutation.isPending}>
                            {updateLobbyMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {translate("Save Changes")}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="participants">
                {isLoadingParticipants ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : participants?.length ? (
                  <ScrollArea className="h-[400px] px-1">
                    <div className="space-y-4">
                      <div className="text-sm text-muted-foreground mb-2">
                        {translate("Total students")}: {participants.length}
                      </div>
                      
                      {participants.map((participant: any) => (
                        <div key={participant.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <div className="font-medium">{participant.fullName || participant.username || "Unknown Student"}</div>
                              <div className="text-sm text-muted-foreground">
                                {translate("Joined")}: {new Date(participant.joinedAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleRemoveParticipant(participant.id)}
                            disabled={removeParticipantMutation.isPending}
                          >
                            {removeParticipantMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <UserX className="h-4 w-4" />
                            <span className="sr-only">{translate("Remove")}</span>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Users className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      {translate("No Students Yet")}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {translate("Share the lobby code with your students to join this game.")}
                    </p>
                    <div className="flex items-center justify-center gap-2 p-3 bg-muted rounded">
                      <div className="text-xl font-mono font-semibold">{lobby?.lobbyCode}</div>
                      <Button
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(lobby?.lobbyCode);
                          toast({
                            title: translate("Code copied"),
                            description: translate("Lobby code copied to clipboard"),
                          });
                        }}
                      >
                        {translate("Copy")}
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>
              {/* Management tabs removed as requested */}
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}