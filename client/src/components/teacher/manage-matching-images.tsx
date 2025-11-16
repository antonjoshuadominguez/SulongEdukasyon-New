import { useState, useEffect } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileUpload } from "@/components/ui/file-upload";
import { Trash2, Plus, AlertCircle, Image } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface ImagePair {
  id?: number;
  imageUrl: string;
  description: string;
}

interface ManageMatchingImagesProps {
  lobbyId: number;
}

export default function ManageMatchingImages({ lobbyId }: ManageMatchingImagesProps) {
  const { translate } = useLanguage();
  const { toast } = useToast();
  const [images, setImages] = useState<ImagePair[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewImage, setPreviewImage] = useState<ImagePair | null>(null);
  
  // Maximum number of image pairs allowed
  const MAX_IMAGES = 6;

  // Fetch existing images
  useEffect(() => {
    const fetchImages = async () => {
      try {
        setLoading(true);
        
        // First, try to fetch from the game lobby directly
        const lobbyResponse = await fetch(`/api/lobbies/${lobbyId}`);
        
        if (lobbyResponse.ok) {
          const lobbyData = await lobbyResponse.json();
          
          // Check if we have matching images in the new format
          if (lobbyData.customMatchingImages) {
            try {
              const parsedImages = JSON.parse(lobbyData.customMatchingImages);
              if (Array.isArray(parsedImages) && parsedImages.length > 0) {
                console.log("Found matching images in lobby data:", parsedImages.length);
                setImages(parsedImages);
                setLoading(false);
                return;
              }
            } catch (parseError) {
              console.error("Error parsing customMatchingImages:", parseError);
            }
          }
        }
        
        // Fallback to the old method if we don't have matching images in the new format
        const response = await fetch(`/api/game-images/${lobbyId}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log("Using legacy method, found images:", data.length);
          setImages(data);
        }
      } catch (error) {
        console.error("Error fetching images:", error);
        toast({
          title: translate("Error"),
          description: translate("Failed to load matching images"),
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchImages();
  }, [lobbyId, toast, translate]);

  // Add new empty image pair
  const addImagePair = () => {
    if (images.length >= MAX_IMAGES) {
      toast({
        title: translate("Limit Reached"),
        description: translate("You can add a maximum of 6 image pairs"),
        variant: "destructive",
      });
      return;
    }
    
    // Focus on the new image item after it's been added
    setImages([...images, { imageUrl: "", description: "" }]);
    
    // Scroll to the new card after a short delay (to allow rendering)
    setTimeout(() => {
      const latestCard = document.getElementById(`image-pair-${images.length}`);
      if (latestCard) {
        latestCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  // Remove image pair
  const removeImagePair = async (index: number) => {
    const newImages = [...images];
    
    // Remove the image at the specified index - no server call needed
    // We'll save all changes when the user clicks the Save button
    
    newImages.splice(index, 1);
    setImages(newImages);
  };

  // Update image URL
  const updateImageUrl = (index: number, base64: string | null) => {
    console.log(`Updating image URL for index ${index}, received base64:`, base64 ? `${base64.substring(0, 50)}...` : "null");
    
    // Validate the base64 string
    if (base64 && !base64.startsWith('data:image/')) {
      console.error("Invalid base64 image data:", base64.substring(0, 50));
      toast({
        title: translate("Error"),
        description: translate("Invalid image data received"),
        variant: "destructive",
      });
      return;
    }
    
    const newImages = [...images];
    newImages[index] = { ...newImages[index], imageUrl: base64 || "" };
    setImages(newImages);
    console.log(`Updated images array, new length: ${newImages.length}`);
  };

  // Update image description
  const updateDescription = (index: number, description: string) => {
    const newImages = [...images];
    newImages[index] = { ...newImages[index], description };
    setImages(newImages);
  };

  // Save all images
  const saveImages = async () => {
    // Validate
    const invalidImages = images.filter(img => !img.imageUrl || !img.description);
    if (invalidImages.length > 0) {
      toast({
        title: translate("Validation Error"),
        description: translate("All images must have both an image and a description"),
        variant: "destructive",
      });
      return;
    }
    
    try {
      setSaving(true);
      console.log("Saving images:", images.length);
      
      // New approach: Save all images directly to the game lobby
      const matchingImagesJson = JSON.stringify(images);
      
      // Update the lobby with our matching images
      const response = await apiRequest("PATCH", `/api/lobbies/${lobbyId}`, {
        customMatchingImages: matchingImagesJson
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update lobby with matching images: ${response.statusText}`);
      }
      
      toast({
        title: translate("Success"),
        description: translate("Matching images saved successfully"),
      });
      
      // For any existing images in the old format, clean them up - just best effort
      try {
        const oldImagesResponse = await fetch(`/api/game-images/${lobbyId}`);
        if (oldImagesResponse.ok) {
          const oldImages = await oldImagesResponse.json();
          
          // Delete old images if they exist
          for (const oldImage of oldImages) {
            if (oldImage.id) {
              await apiRequest("DELETE", `/api/game-images/${oldImage.id}`);
            }
          }
          console.log("Cleaned up old format images");
        }
      } catch (cleanupError) {
        // Non-fatal, just log it
        console.warn("Error cleaning up old format images:", cleanupError);
      }
      
    } catch (error) {
      console.error("Error saving images:", error);
      toast({
        title: translate("Error"),
        description: translate("Failed to save images"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Preview an image
  const openPreview = (image: ImagePair) => {
    setPreviewImage(image);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{translate("Matching Images")}</h2>
        <Button 
          onClick={addImagePair} 
          disabled={images.length >= MAX_IMAGES || saving}
        >
          <Plus className="h-4 w-4 mr-2" />
          {translate("Add Image Pair")}
        </Button>
      </div>
      
      {images.length === 0 && !loading && (
        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{translate("No Images")}</AlertTitle>
            <AlertDescription>
              {translate("Click the 'Add Image Pair' button to add your first pair of images and descriptions for students to match")}
            </AlertDescription>
          </Alert>
          
          <div className="flex justify-center mt-4">
            <Button onClick={addImagePair} disabled={saving}>
              <Plus className="h-4 w-4 mr-2" />
              {translate("Add Your First Image Pair")}
            </Button>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {images.map((image, index) => (
          <Card key={index} id={`image-pair-${index}`} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor={`image-${index}`} className="mb-2 block">
                    {translate("Image")} {index + 1}
                  </Label>
                  <FileUpload
                    onFileChange={(base64) => updateImageUrl(index, base64)}
                    value={image.imageUrl}
                    accept="image/*"
                    maxSize={10}
                  />
                </div>
                
                <div>
                  <Label htmlFor={`description-${index}`} className="mb-2 block">
                    {translate("Description")}
                  </Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    {translate("This description will be shown when students match the images")}
                  </p>
                  <Textarea
                    id={`description-${index}`}
                    value={image.description}
                    onChange={(e) => updateDescription(index, e.target.value)}
                    placeholder={translate("Enter a description for this image")}
                    className="resize-none"
                    rows={3}
                  />
                </div>
                
                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openPreview(image)}
                    disabled={!image.imageUrl}
                  >
                    <Image className="h-4 w-4 mr-2" />
                    {translate("Preview")}
                  </Button>
                  
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => removeImagePair(index)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {translate("Remove")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {images.length > 0 && (
        <div className="flex justify-end">
          <Button onClick={saveImages} disabled={saving}>
            {saving ? translate("Saving...") : translate("Save Images")}
          </Button>
        </div>
      )}
      
      {/* Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{translate("Image Preview")}</DialogTitle>
            <DialogDescription>
              {translate("This is how the image and description will appear when matched")}
            </DialogDescription>
          </DialogHeader>
          
          {previewImage && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <img 
                  src={previewImage.imageUrl}
                  alt="Preview"
                  className="max-h-[250px] rounded object-contain"
                />
              </div>
              
              <div className="p-3 bg-muted rounded">
                <p>{previewImage.description}</p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setPreviewImage(null)}
            >
              {translate("Close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}