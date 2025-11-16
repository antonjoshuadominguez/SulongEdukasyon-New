import React, { useState, useRef } from "react";
import { Upload, ImageIcon, X, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/use-language";

interface FileUploadProps {
  onFileChange: (base64: string | null) => void;
  value?: string;
  accept?: string;
  maxSize?: number; // in MB
  className?: string;
}

export function FileUpload({
  onFileChange,
  value,
  accept = "image/*",
  maxSize = 10, // Default 10MB
  className
}: FileUploadProps) {
  const { translate } = useLanguage();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(value || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("Drag enter event triggered");
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) {
      console.log("Drag over event triggered");
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set isDragging to false if we're leaving the main drop area
    // This fixes issues with child elements causing drag leave events
    if (e.currentTarget.contains(e.relatedTarget as Node)) {
      return;
    }
    console.log("Drag leave event triggered");
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    console.log("File dropped", e.dataTransfer.files);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      console.log("Processing dropped file:", e.dataTransfer.files[0].name, e.dataTransfer.files[0].type);
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    console.log("Processing file:", file.name, file.type, file.size);
    
    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      const errorMsg = `${translate("File too large")}. ${translate("Maximum size is")} ${maxSize}MB.`;
      console.log("File too large:", file.size, "max:", maxSize * 1024 * 1024);
      setError(errorMsg);
      return;
    }

    // Check file type
    const typeRegex = accept.replace('*', '.');
    console.log("Checking file type:", file.type, "against:", typeRegex);
    if (!file.type.match(typeRegex)) {
      const errorMsg = `${translate("Invalid file type")}. ${translate("Please upload")} ${accept.replace('*', '')}.`;
      console.log("Invalid file type:", file.type);
      setError(errorMsg);
      return;
    }

    setError(null);
    setIsUploading(true);
    console.log("Starting file upload");

    const reader = new FileReader();
    
    reader.onload = (e) => {
      console.log("FileReader onload fired");
      const base64 = e.target?.result as string;
      if (base64) {
        console.log("Base64 data generated:", base64.substring(0, 50) + "...");
        setPreview(base64);
        onFileChange(base64);
      } else {
        console.error("Failed to generate base64 data");
        setError(translate("Error processing image"));
      }
      setIsUploading(false);
    };
    
    reader.onerror = (error) => {
      console.error("FileReader error:", error);
      setError(translate("Error reading file"));
      setIsUploading(false);
    };
    
    reader.readAsDataURL(file);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
    onFileChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={cn("w-full", className)}>
      <div
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-md p-6 cursor-pointer transition-colors duration-200 text-center",
          isDragging ? "border-primary bg-primary/5" : "border-gray-300 hover:border-primary/50",
          preview ? "py-3" : "py-10"
        )}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          accept={accept}
          className="hidden"
        />
        
        {isUploading ? (
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
            <p className="text-sm text-gray-500">{translate("Processing file...")}</p>
          </div>
        ) : preview ? (
          <div className="flex flex-col items-center space-y-2">
            <div className="relative w-full max-w-xs mx-auto">
              <img src={preview} alt="Preview" className="max-h-[150px] rounded object-contain mx-auto" />
              <button 
                onClick={clearFile}
                className="absolute -top-2 -right-2 p-1 bg-destructive rounded-full text-white"
                title={translate("Remove file")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center text-sm text-primary mt-1">
              <Check className="h-4 w-4 mr-1" />
              {translate("Image uploaded")}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center">
            {accept.includes('image') ? (
              <ImageIcon className="h-12 w-12 text-gray-400 mb-4" />
            ) : (
              <Upload className="h-12 w-12 text-gray-400 mb-4" />
            )}
            <p className="text-sm font-medium mb-1">
              {translate("Drag and drop your file here or click to browse")}
            </p>
            <p className="text-xs text-gray-500">
              {translate("Maximum file size")}: {maxSize}MB
            </p>
          </div>
        )}
      </div>
      
      {error && (
        <p className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}