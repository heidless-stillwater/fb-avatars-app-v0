
'use client';

import { Card, CardContent } from "@/components/ui/card";
import AvatarsProcessor from "@/components/avatars-processor";
import ImgLibProcessor from "@/components/img-lib-processor";
import CategoryProcessor from "@/components/category-processor";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function AvatarsPage() {
    const [isAvatarsOpen, setIsAvatarsOpen] = useState(true);
    const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
    const [isImageLibraryOpen, setIsImageLibraryOpen] = useState(true);

    return (
        <div className="p-4 sm:p-6 md:p-8 h-full space-y-8 w-full overflow-x-auto">
            <Collapsible open={isAvatarsOpen} onOpenChange={setIsAvatarsOpen} className="space-y-2 md:space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-3 md:p-4">
                    <div className="space-y-1">
                        <h2 className="text-lg md:text-xl font-semibold">Avatars</h2>
                        <p className="text-xs md:text-sm text-muted-foreground">Create and manage your avatars.</p>
                    </div>
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-9 p-0">
                            <ChevronsUpDown className="h-4 w-4" />
                            <span className="sr-only">Toggle Avatars</span>
                        </Button>
                    </CollapsibleTrigger>
                </div>
                <CollapsibleContent>
                     <Card>
                        <CardContent className="pt-6">
                            <AvatarsProcessor />
                        </CardContent>
                    </Card>
                </CollapsibleContent>
            </Collapsible>
            
            <Separator />

            <Collapsible open={isCategoryManagerOpen} onOpenChange={setIsCategoryManagerOpen} className="space-y-2 md:space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-3 md:p-4">
                    <div className="space-y-1">
                        <h2 className="text-lg md:text-xl font-semibold">Category Manager</h2>
                         <p className="text-xs md:text-sm text-muted-foreground">Organize your image library.</p>
                    </div>
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-9 p-0">
                            <ChevronsUpDown className="h-4 w-4" />
                            <span className="sr-only">Toggle Category Manager</span>
                        </Button>
                    </CollapsibleTrigger>
                </div>
                <CollapsibleContent>
                    <CategoryProcessor />
                </CollapsibleContent>
            </Collapsible>
            
            <Separator />

             <Collapsible open={isImageLibraryOpen} onOpenChange={setIsImageLibraryOpen} className="space-y-2 md:space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-3 md:p-4">
                     <div className="space-y-1">
                        <h2 className="text-lg md:text-xl font-semibold">Image Library</h2>
                        <p className="text-xs md:text-sm text-muted-foreground">Store and manage reusable images.</p>
                    </div>
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-9 p-0">
                            <ChevronsUpDown className="h-4 w-4" />
                            <span className="sr-only">Toggle Image Library</span>
                        </Button>
                    </CollapsibleTrigger>
                </div>
                <CollapsibleContent>
                    <ImgLibProcessor />
                </CollapsibleContent>
            </Collapsible>
        </div>
    )
}
