
'use client';

import { useState } from "react";
import Link from "next/link";
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/modules/shared/components/ui/ui/card";
import { Input } from "@/modules/shared/components/ui/ui/input";
import { Label } from "@/modules/shared/components/ui/ui/label";
import { Button } from "@/modules/shared/components/ui/ui/button";
import { signInWithPassword } from "@/modules/auth/services/supabase-auth-actions";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff } from "lucide-react";

const Logo = () => (
    <svg width="240" height="52" viewBox="0 0 240 52" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto">
      <g transform="skewX(-15)">
        <path d="M0 0 H40 L28 52 H-12 Z" fill="#8ab4f8" />
        <path d="M42 0 H82 L70 52 H30 Z" fill="#004488" />
        <path d="M84 0 H124 L112 52 H72 Z" fill="#DB4437" />
      </g>
      <text x="54" y="32" fontFamily="serif" fontSize="28" fill="currentColor" className="font-semibold tracking-wider">
        OPENROAD
      </text>
      <text x="180" y="48" fontFamily="serif" fontSize="10" fill="currentColor" className="font-light tracking-widest">
        THAILAND
      </text>
    </svg>
);


export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const result = await signInWithPassword(email, password);

    if (result.success) {
      toast({
        title: "Login Successful",
        description: "Welcome back!",
      });
      router.push('/dashboard');
    } else {
      toast({
        title: "Login Failed",
        description: result.error,
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page flex min-h-screen items-center justify-center p-4">
      <Card className="z-10 w-full max-w-md bg-gray-900/20 backdrop-blur-sm border-white/20 text-white">
        <CardHeader className="space-y-4 text-center">
          <Logo />
          <CardTitle className="text-3xl font-bold tracking-tight">
            Welcome Back
          </CardTitle>
          <CardDescription className="text-gray-200">
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                className="bg-white/20 dark:bg-black/30 border-white/30 placeholder:text-gray-300"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="#"
                  className="ml-auto inline-block text-sm text-primary-foreground/80 hover:underline"
                >
                  Forgot your password?
                </Link>
              </div>
               <div className="relative">
                <Input 
                    id="password" 
                    type={showPassword ? "text" : "password"}
                    required  
                    className="bg-white/20 dark:bg-black/30 border-white/30 pr-10 placeholder:text-gray-300"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                />
                <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)} 
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-200 hover:text-white"
                >
                    {showPassword ? <EyeOff className="h-5 w-5"/> : <Eye className="h-5 w-5"/>}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full bg-white/90 text-black hover:bg-white" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
              Sign In
            </Button>
             <p className="text-center text-sm text-gray-300">
              Don&apos;t have an account?{' '}
              <Link href="#" className="font-semibold text-white hover:underline">
                Contact Support
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}



