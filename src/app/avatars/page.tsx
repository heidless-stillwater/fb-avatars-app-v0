'use client';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import AvatarsProcessor from "@/components/avatars-processor";
import ImgLibProcessor from "@/components/img-lib-processor";
import { Separator } from "@/components/ui/separator";

export default function AvatarsPage() {
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
            <ImgLibProcessor />
        </div>
    )
}
