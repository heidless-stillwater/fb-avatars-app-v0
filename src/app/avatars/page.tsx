'use client';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
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
    const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);

    return (
        <div className="p-4 sm:p-6 md:p-8 h-full space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Avatars</CardTitle>
                    <CardDescription>Create and manage your avatars.</CardDescription>
                </CardHeader>
                <CardContent>
                    <AvatarsProcessor />
                </CardContent>
            </Card>
            <Separator />
            <Collapsible open={isCategoryManagerOpen} onOpenChange={setIsCategoryManagerOpen}>
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Category Manager</h2>
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-9 p-0">
                            <ChevronsUpDown className="h-4 w-4" />
                            <span className="sr-only">Toggle Category Manager</span>
                        </Button>
                    </CollapsibleTrigger>
                </div>
                <CollapsibleContent className="space-y-4">
                    <CategoryProcessor />
                </CollapsibleContent>
            </Collapsible>
            <Separator />
            <ImgLibProcessor />
        </div>
    )
}
