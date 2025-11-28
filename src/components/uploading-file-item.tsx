"use client";

import type { UploadingFile } from "@/lib/types";
import { Progress } from "@/components/ui/progress";
import { formatBytes } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

export function UploadingFileItem({ file }: { file: UploadingFile }) {
  return (
    <Card className="w-full bg-muted/50">
      <CardContent className="p-3 sm:p-4">
        <div className="flex justify-between items-center gap-4">
          <div className="truncate flex-1">
            <p className="font-medium text-sm truncate">{file.name}</p>
            <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
          </div>
          <div className="w-24 flex items-center gap-2">
            <Progress value={file.progress} className="h-2 flex-1" />
            <p className="text-xs text-muted-foreground w-9 text-right">{file.progress}%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
