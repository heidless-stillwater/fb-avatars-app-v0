'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ContactForm from '@/components/contact-form';

export default function ContactPage() {
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Contact Us</CardTitle>
          <CardDescription>
            Have a question or feedback? Fill out the form below to get in touch.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ContactForm />
        </CardContent>
      </Card>
    </div>
  );
}
