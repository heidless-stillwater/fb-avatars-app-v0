'use client';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import AvatarsProcessor from "@/components/avatars-processor";

export default function AvatarsPage() {
    return (
        <div className="p-4 sm:p-6 md:p-8 h-full">
            <Card className="h-full">
                <CardHeader>
                    <CardTitle>Avatars</CardTitle>
                    <CardDescription>Create and manage your avatars.</CardDescription>
                </CardHeader>
                <CardContent>
                    <AvatarsProcessor />
                </CardContent>
            </Card>
        </div>
    )
}
