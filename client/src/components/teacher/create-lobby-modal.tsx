import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
  DialogTrigger,
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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileUpload } from "@/components/ui/file-upload";
import { Loader2, Plus, GamepadIcon, BookIcon, X } from "lucide-react";

// Create a schema for form validation
const createLobbySchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().optional(),
  gameType: z.enum([
    "picture_puzzle", 
    "picture_matching", 
    "arrange_timeline", 
    "explain_image", 
    "fill_blanks", 
    "tama_ang_ayos", 
    "true_or_false"
  ]),
  // Custom fields for Picture Puzzle
  customImageUrl: z.string().optional(),
  customImageDescription: z.string().optional(),
  
  // Custom fields for True or False
  customQuestions: z.string().optional(),
  
  // Custom fields for Explain Image
  customExplainImageUrl: z.string().optional(),
  customExplainQuestions: z.string().optional(),
  
  // Custom fields for Arrange Timeline
  customEvents: z.string().optional(),
  
  // Custom fields for Fill Blanks
  customSentences: z.string().optional(),
  
  // Custom fields for Tama ang Ayos - Category pairs
  category_1: z.string().optional(),
  content_items_1: z.string().optional(),
  category_2: z.string().optional(),
  content_items_2: z.string().optional(),
  category_3: z.string().optional(),
  content_items_3: z.string().optional(),
  category_4: z.string().optional(),
  content_items_4: z.string().optional(),
  
  // Old fields for backward compatibility
  customCategories: z.string().optional(),
  customItems: z.string().optional(),
  
  // Custom fields for Picture Matching - Allow up to 6 pairs
  matching_image_1: z.string().optional(),
  matching_description_1: z.string().optional(),
  matching_image_2: z.string().optional(),
  matching_description_2: z.string().optional(),
  matching_image_3: z.string().optional(),
  matching_description_3: z.string().optional(),
  matching_image_4: z.string().optional(),
  matching_description_4: z.string().optional(),
  matching_image_5: z.string().optional(),
  matching_description_5: z.string().optional(),
  matching_image_6: z.string().optional(),
  matching_description_6: z.string().optional(),
});

type CreateLobbyFormValues = z.infer<typeof createLobbySchema>;

interface CreateLobbyModalProps {
  trigger?: React.ReactNode;
}

export default function CreateLobbyModal({ trigger }: CreateLobbyModalProps) {
  const { translate } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [imagePairs, setImagePairs] = useState(1);
  const [categoryPairs, setCategoryPairs] = useState(2); // Start with 2 category pairs
  
  // Functions to add and remove image pairs
  const addImagePair = () => {
    if (imagePairs < 6) {
      setImagePairs(prev => prev + 1);
    }
  };
  
  const removeImagePair = (index: number) => {
    if (imagePairs > 1) {
      setImagePairs(prev => prev - 1);
    }
  };
  
  // Functions to add and remove category pairs
  const addCategoryPair = () => {
    if (categoryPairs < 4) {
      setCategoryPairs(prev => prev + 1);
    }
  };
  
  const removeCategoryPair = (index: number) => {
    if (categoryPairs > 2) {
      setCategoryPairs(prev => prev - 1);
    }
  };
  
  // All available game types
  const allGameTypes = [
    "picture_puzzle", 
    "picture_matching", 
    "arrange_timeline", 
    "explain_image", 
    "fill_blanks", 
    "tama_ang_ayos", 
    "true_or_false"
  ];
  
  // Form setup
  const form = useForm<CreateLobbyFormValues>({
    resolver: zodResolver(createLobbySchema),
    defaultValues: {
      name: "",
      description: "",
      gameType: "picture_puzzle"  // Set default game type
    }
  });
  
  // Watch the game type field
  const gameType = form.watch("gameType");
  
  // Game type descriptions
  const gameDescriptions: Record<string, string> = {
    picture_puzzle: "Students will solve sliding puzzles based on historical images.",
    picture_matching: "Students will match historical images with their correct descriptions.",
    arrange_timeline: "Students will arrange historical events in chronological order.",
    explain_image: "Students will answer questions about historical images.",
    fill_blanks: "Students will complete sentences about historical facts.",
    tama_ang_ayos: "Students will sort historical events into correct categories.",
    true_or_false: "Students will determine if historical statements are true or false."
  };
  
  // Mutation for creating a lobby
  const createLobbyMutation = useMutation({
    mutationFn: async (data: CreateLobbyFormValues) => {
      const res = await apiRequest('POST', '/api/teacher/lobbies', data);
      return await res.json();
    },
    onSuccess: async (createdLobby) => {
      queryClient.invalidateQueries({ queryKey: ['/api/teacher/lobbies'] });
      
      // If this is a picture matching game and we have images to upload
      if (gameType === "picture_matching") {
        // Get all form values
        const formValues = form.getValues();
        
        // Upload all available image pairs (up to 6)
        for (let i = 1; i <= 6; i++) {
          const imageField = `matching_image_${i}` as keyof CreateLobbyFormValues;
          const descriptionField = `matching_description_${i}` as keyof CreateLobbyFormValues;
          
          const imageUrl = formValues[imageField] as string | undefined;
          const description = formValues[descriptionField] as string | undefined;
          
          // Only upload if both image and description are provided
          if (imageUrl && description) {
            try {
              await apiRequest('POST', '/api/game-images', {
                lobbyId: createdLobby.id,
                imageUrl,
                description
              });
              
              console.log(`Successfully uploaded image pair ${i} for lobby:`, createdLobby.id);
            } catch (error) {
              console.error(`Failed to upload image pair ${i}:`, error);
            }
          }
        }
      }
      
      toast({
        title: translate("Lobby created"),
        description: translate("Your new game lobby has been created successfully"),
      });
      setOpen(false);
      form.reset({
        name: "",
        description: "",
        gameType: "picture_puzzle"
      });
    },
    onError: (error: Error) => {
      toast({
        title: translate("Failed to create lobby"),
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Form submission handler
  const onSubmit = (values: CreateLobbyFormValues) => {
    // For "tama_ang_ayos" game type, we need to convert the category pairs to the format expected by the game
    if (values.gameType === "tama_ang_ayos") {
      // Process category data
      const categories: string[] = [];
      const contentItemsMap: Record<number, string[]> = {};
      
      // Collect all categories and content items from the form
      for (let i = 1; i <= 4; i++) {
        const categoryField = `category_${i}` as keyof CreateLobbyFormValues;
        const contentItemsField = `content_items_${i}` as keyof CreateLobbyFormValues;
        
        const category = values[categoryField] as string | undefined;
        const contentItems = values[contentItemsField] as string | undefined;
        
        // Only process if both category and items are provided
        if (category && contentItems) {
          categories.push(category);
          
          // Split content items by newline and associate with this category index
          const items = contentItems.split('\n').filter(item => item.trim() !== '');
          contentItemsMap[i] = items;
        }
      }
      
      if (categories.length > 0) {
        // Convert to format expected by the game component
        const customCategories = categories.join('\n');
        
        // Convert content items to the format: ItemText|CategoryNumber
        const allItems: string[] = [];
        Object.entries(contentItemsMap).forEach(([categoryIndex, items]) => {
          items.forEach(item => {
            allItems.push(`${item}|${categoryIndex}`);
          });
        });
        
        const customItems = allItems.join('\n');
        
        // Update the values object with the processed data
        values.customCategories = customCategories;
        values.customItems = customItems;
      }
    }
    
    createLobbyMutation.mutate(values);
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {translate("Create Game Lobby")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{translate("Create a New Game Lobby")}</DialogTitle>
          <DialogDescription>
            {translate("Set up a new game lobby for your students to join and play educational games.")}
          </DialogDescription>
        </DialogHeader>
        
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
                  <FormDescription>
                    {translate("This will be visible to your students")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{translate("Description")} ({translate("optional")})</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder={translate("Provide additional details about this game lobby")} 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="gameType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{translate("Game Type")}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={translate("Select a game type")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {allGameTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {translate(type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '))}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {translate(gameDescriptions[gameType] || "Select a game type")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Custom fields for each game type */}
            
            {/* Picture Puzzle customization */}
            {gameType === "picture_puzzle" && (
              <>
                <FormField
                  control={form.control}
                  name="customImageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{translate("Puzzle Image")}</FormLabel>
                      <FormControl>
                        <FileUpload
                          onFileChange={(base64) => {
                            field.onChange(base64);
                          }}
                          value={field.value || ""}
                          accept="image/*"
                          maxSize={10} // 10MB max
                        />
                      </FormControl>
                      <FormDescription>
                        {translate("Upload an image for the students to solve as a puzzle")}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="customImageDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{translate("Image Description")}</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder={translate("Enter description or historical context for this image")} 
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription>
                        {translate("This description will be shown to students when they complete the puzzle")}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
            
            {/* True or False customization */}
            {gameType === "true_or_false" && (
              <FormField
                control={form.control}
                name="customQuestions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{translate("Custom Questions")}</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder={translate("Enter true/false questions, one per line. Format: Question|true or Question|false")} 
                        {...field}
                        value={field.value || ""}
                        className="min-h-[200px]"
                      />
                    </FormControl>
                    <FormDescription>
                      {translate("Example: The Philippines declared independence in 1898|true")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            {/* Explain Image customization */}
            {gameType === "explain_image" && (
              <>
                <FormField
                  control={form.control}
                  name="customExplainImageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{translate("Image to Explain")}</FormLabel>
                      <FormControl>
                        <FileUpload
                          onFileChange={(base64) => {
                            field.onChange(base64);
                          }}
                          value={field.value || ""}
                          accept="image/*"
                          maxSize={10} // 10MB max
                        />
                      </FormControl>
                      <FormDescription>
                        {translate("Upload an image that students will need to explain")}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="customExplainQuestions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{translate("Questions about the Image")}</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder={translate("Enter questions about the image, one per line. Format: Question|Option1|Option2|Option3|Option4|CorrectOptionNumber")} 
                          {...field}
                          value={field.value || ""}
                          className="min-h-[200px]"
                        />
                      </FormControl>
                      <FormDescription>
                        {translate("Example: Who is in this image?|Juan Luna|Jose Rizal|Andres Bonifacio|Emilio Aguinaldo|2")}
                        <br />
                        {translate("Note: The last number (2) indicates that 'Jose Rizal' (option #2) is the correct answer.")}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
            
            {/* Arrange Timeline customization */}
            {gameType === "arrange_timeline" && (
              <FormField
                control={form.control}
                name="customEvents"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{translate("Timeline Events")}</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder={translate("Enter events in chronological order, one per line. Format: Year|Event Description")} 
                        {...field}
                        value={field.value || ""}
                        className="min-h-[200px]"
                      />
                    </FormControl>
                    <FormDescription>
                      {translate("Example: 1521|Arrival of Ferdinand Magellan in the Philippines")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            {/* Fill Blanks customization */}
            {gameType === "fill_blanks" && (
              <FormField
                control={form.control}
                name="customSentences"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{translate("Fill in the Blank Sentences")}</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder={translate("Enter sentences with blanks, one per line. Format: Sentence with [blank] for missing word|correct answer")} 
                        {...field}
                        value={field.value || ""}
                        className="min-h-[200px]"
                      />
                    </FormControl>
                    <FormDescription>
                      {translate("Example: The [blank] Revolution began in 1896|Philippine")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            

            {/* Tama ang Ayos customization */}
            {gameType === "tama_ang_ayos" && (
              <div className="space-y-6">
                <div className="p-4 border rounded-md bg-muted/30 mb-4">
                  <h3 className="font-medium">{translate("Tama ang Ayos Game")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {translate("Create categories and content items for students to sort.")}
                  </p>
                </div>
                
                {/* Dynamic Category-Content Pairs */}
                {Array.from({ length: categoryPairs }, (_, index) => (
                  <div key={index} className="border rounded-md p-4 mb-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-medium">{translate("Category-Content Pair")} {index + 1}</h4>
                      {index > 1 && ( // Allow removing pairs but keep at least 2
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => removeCategoryPair(index)}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                          <span className="sr-only">{translate("Remove")}</span>
                        </Button>
                      )}
                    </div>
                    
                    <FormField
                      control={form.control}
                      name={`category_${index + 1}` as any}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{translate("Category")}</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder={translate("Enter a category")} 
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormDescription>
                            {translate("Example: Spanish Colonial Period")}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="mt-4">
                      <FormField
                        control={form.control}
                        name={`content_items_${index + 1}` as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{translate("Content Items")}</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder={translate("Enter content items, one per line")} 
                                {...field}
                                value={field.value || ""}
                                className="min-h-[100px]"
                                rows={3}
                              />
                            </FormControl>
                            <FormDescription>
                              {translate("Example:\nFerdinand Magellan arrives in the Philippines\nJose Rizal publishes Noli Me Tangere")}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                ))}
                
                {/* Add another pair button */}
                <div className="flex justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full mt-2"
                    onClick={addCategoryPair}
                    disabled={categoryPairs >= 4}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {translate("Add Another Category Pair")}
                  </Button>
                </div>
                
                {categoryPairs >= 4 && (
                  <p className="text-sm text-muted-foreground text-center">
                    {translate("Maximum of 4 category pairs allowed")}
                  </p>
                )}
              </div>
            )}
            
            {/* Picture Matching customization */}
            {gameType === "picture_matching" && (
              <div className="space-y-4">
                <div className="p-4 border rounded-md bg-muted/30 mb-4">
                  <h3 className="font-medium">{translate("Picture Matching Game")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {translate("Upload image pairs with descriptions for students to match.")}
                  </p>
                </div>
                
                {/* Dynamic Image Pairs */}
                {Array.from({ length: imagePairs }, (_, index) => (
                  <div key={index} className="border rounded-md p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-medium">{translate("Image Pair")} {index + 1}</h4>
                      {index > 0 && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => removeImagePair(index)}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                          <span className="sr-only">{translate("Remove")}</span>
                        </Button>
                      )}
                    </div>
                    
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name={`matching_image_${index + 1}` as "matching_image_1" | "matching_image_2" | "matching_image_3" | "matching_image_4" | "matching_image_5" | "matching_image_6"}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{translate("Image")}</FormLabel>
                            <FormControl>
                              <FileUpload
                                onFileChange={(base64) => {
                                  field.onChange(base64);
                                }}
                                value={field.value || ""}
                                accept="image/*"
                                maxSize={10} // 10MB max
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name={`matching_description_${index + 1}` as "matching_description_1" | "matching_description_2" | "matching_description_3" | "matching_description_4" | "matching_description_5" | "matching_description_6"}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{translate("Description")}</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder={translate("Enter a description for this image")} 
                                {...field}
                                value={field.value || ""}
                                rows={3}
                                className="resize-none"
                              />
                            </FormControl>
                            <FormDescription>
                              {translate("This description will be shown when students match the images")}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                ))}
                
                {/* Add another pair button */}
                <div className="flex justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full mt-2"
                    onClick={addImagePair}
                    disabled={imagePairs >= 6}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {translate("Add Another Pair")}
                  </Button>
                </div>
                
                {imagePairs >= 6 && (
                  <p className="text-sm text-muted-foreground text-center">
                    {translate("Maximum of 6 image pairs allowed")}
                  </p>
                )}
              </div>
            )}
            
            <DialogFooter>
              <Button type="submit" disabled={createLobbyMutation.isPending}>
                {createLobbyMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {translate("Create Lobby")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}