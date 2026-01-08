
'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { useFirebaseApp } from '@/firebase';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Trash2, UploadCloud } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface ImageUploaderProps {
  imageUrls: string[];
  onUrlsChange: (urls: string[]) => void;
  maxFiles?: number;
  uploadPath: string;
}

const ImageUploader = ({ imageUrls, onUrlsChange, maxFiles = 1, uploadPath }: ImageUploaderProps) => {
  const firebaseApp = useFirebaseApp();
  const storage = getStorage(firebaseApp);
  const { toast } = useToast();
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (imageUrls.length + acceptedFiles.length > maxFiles) {
      toast({
        variant: 'destructive',
        title: 'Upload limit reached',
        description: `You can only upload a maximum of ${maxFiles} files.`,
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress({});

    const uploadPromises = acceptedFiles.map((file) => {
      const fileName = `${uploadPath}/${Date.now()}-${file.name}`;
      const storageRef = ref(storage, fileName);
      const uploadTask = uploadBytesResumable(storageRef, file);

      return new Promise<string>((resolve, reject) => {
        uploadTask.on('state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(prev => ({ ...prev, [fileName]: progress }));
          },
          (error) => {
            console.error("Upload failed for a file:", error);
            reject(error);
          },
          () => {
            getDownloadURL(uploadTask.snapshot.ref).then(resolve);
          }
        );
      });
    });

    try {
      const newUrls = await Promise.all(uploadPromises);
      onUrlsChange([...imageUrls, ...newUrls]);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: 'One or more images could not be uploaded.',
      });
      console.error("Error uploading files:", error);
    } finally {
      setIsUploading(false);
    }
  }, [storage, uploadPath, imageUrls, onUrlsChange, maxFiles, toast]);


  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    disabled: isUploading || imageUrls.length >= maxFiles,
  });

  const handleDelete = async (urlToDelete: string) => {
    if (isUploading) {
        toast({
            variant: 'destructive',
            title: 'Please wait',
            description: 'Cannot delete images while an upload is in progress.',
        });
        return;
    }

    try {
      const imageRef = ref(storage, urlToDelete);
      await deleteObject(imageRef);
      onUrlsChange(imageUrls.filter(url => url !== urlToDelete));
      toast({
        title: 'Image Deleted',
        description: 'The image has been successfully removed.',
      });
    } catch (error: any) {
      console.error("Error deleting file:", error);
      if (error.code === 'storage/object-not-found') {
        onUrlsChange(imageUrls.filter(url => url !== urlToDelete));
         toast({
            title: 'Image Removed',
            description: 'The image was already removed from storage.',
        });
      } else {
        toast({
            variant: 'destructive',
            title: 'Delete Failed',
            description: 'Could not delete the image from storage. Please try again.',
        });
      }
    }
  };

  return (
    <div className="space-y-4">
      {imageUrls.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {imageUrls.map((url, index) => (
            <div key={index} className="relative group aspect-square">
              <Image src={url} alt={`Uploaded image ${index + 1}`} fill className="object-cover rounded-md border" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-md">
                <Button variant="destructive" size="icon" onClick={() => handleDelete(url)} aria-label="Delete image">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {imageUrls.length < maxFiles && (
        <div
            {...getRootProps()}
            className={cn(
            'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
            'border-input hover:border-primary/50',
            isDragActive && 'border-primary bg-primary/10',
            isUploading && 'cursor-not-allowed opacity-50'
            )}
        >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <UploadCloud className="w-8 h-8" />
                {isUploading ? (
                    <p>Uploading...</p>
                ) : isDragActive ? (
                    <p>Drop the files here ...</p>
                ) : (
                    <p>Drag & drop images here, or click to select</p>
                )}
                <p className="text-xs">(Max {maxFiles} files, {maxFiles - imageUrls.length} remaining)</p>
            </div>
        </div>
      )}

      {isUploading && (
        <div className="mt-2 space-y-2">
          {Object.entries(uploadProgress).map(([fileName, progress]) => (
            progress < 100 && (
              <div key={fileName}>
                <p className="text-xs text-muted-foreground truncate">{fileName.split('/').pop()}</p>
                <Progress value={progress} className="h-2" />
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageUploader;

    