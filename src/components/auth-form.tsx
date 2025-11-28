'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, LogIn } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';

const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }),
  password: z
    .string()
    .min(6, { message: 'Password must be at least 6 characters.' }),
});

type UserFormValue = z.infer<typeof formSchema>;

export default function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();

  const form = useForm<UserFormValue>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: UserFormValue) => {
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, data.email, data.password);
        toast({ title: 'Success', description: 'Logged in successfully.' });
        router.push('/');
      } else {
        await createUserWithEmailAndPassword(auth, data.email, data.password);
        toast({
          title: 'Success',
          description: 'Account created. Please log in.',
        });
        setIsLogin(true); // Switch to login view after successful sign up
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description:
          error.message || 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4 w-full"
        >
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="Enter your email..."
                    disabled={loading}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="Enter your password..."
                    disabled={loading}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="w-full flex items-center gap-2"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <LogIn />
            )}
            <span>{isLogin ? 'Log In' : 'Sign Up'}</span>
          </Button>
        </form>
      </Form>
      <div className="mt-4 text-center text-sm">
        {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
        <Button
          variant="link"
          className="p-0 h-auto"
          onClick={() => setIsLogin(!isLogin)}
        >
          {isLogin ? 'Sign up' : 'Log in'}
        </Button>
      </div>
    </>
  );
}