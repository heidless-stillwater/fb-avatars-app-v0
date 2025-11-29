
'use client';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import TodoProcessor from "@/components/todo-processor";

export default function TodoPage() {
    return (
        <div className="p-4 sm:p-6 md:p-8 h-full">
            <Card>
                <CardHeader>
                    <CardTitle>Todo List</CardTitle>
                    <CardDescription>Add, manage, and complete your tasks.</CardDescription>
                </CardHeader>
                <CardContent>
                    <TodoProcessor />
                </CardContent>
            </Card>
        </div>
    )
}
