"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { UploadCloud } from "lucide-react";

interface UploadButtonProps {
  onFilesSelected: (files: FileList) => void;
}

export function UploadButton({ onFilesSelected }: UploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      onFilesSelected(event.target.files);
      // Reset input value to allow selecting the same file again
      event.target.value = '';
    }
  };

  return (
    <>
      <input
        type="file"
        ref={inputRef}
        onChange={handleFileChange}
        className="hidden"
        multiple
      />
      <Button onClick={() => inputRef.current?.click()}>
        <UploadCloud className="mr-2 h-4 w-4" />
        Upload Files
      </Button>
    </>
  );
}
