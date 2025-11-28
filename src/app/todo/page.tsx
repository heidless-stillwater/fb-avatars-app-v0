'use client';

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import TodoProcessor from "@/components/todo-processor";

export default function TodoPage() {
    return (
        <div className="p-4 sm:p-6 md:p-8 h-full">
            <Card className="h-full">
                <CardHeader>
                    <CardTitle>Todo List</CardTitle>
                </CardHeader>
                <CardContent>
                    <TodoProcessor />
                </CardContent>
            </Card>
        </div>
    )
}
