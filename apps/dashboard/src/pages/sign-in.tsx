import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
  toast,
} from '@absolo/ui';
import { AbsoloMark } from '@absolo/icons/brand';
import { Eye, EyeOff } from '@absolo/icons';
import { LoginRequestSchema, type LoginRequest } from '@absolo/contracts/auth';
import { useState } from 'react';
import { api } from '@/lib/api';

/**
 * Email + password sign-in. Form validation reuses the canonical
 * `SignInRequestSchema` from `@absolo/contracts` so frontend and server
 * agree on shape and constraints.
 *
 * On success we navigate to `/projects`. Errors are surfaced as toasts
 * — the global ApiError envelope from the control plane carries
 * `requestId` so support can trace incidents.
 */
export function SignInPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginRequest>({
    resolver: zodResolver(LoginRequestSchema),
    defaultValues: { email: '', password: '' },
  });

  const signInMutation = useMutation({
    mutationFn: (req: LoginRequest) => api.auth.login(req),
    onSuccess: () => {
      toast.success('Signed in');
      void navigate({ to: '/projects' });
    },
    onError: (err: Error) => {
      toast.error('Sign-in failed', { description: err.message });
    },
  });

  return (
    <div className="flex min-h-full items-center justify-center bg-bg p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-2">
            <AbsoloMark className="h-7 w-7 text-brand-500" />
            <span className="font-semibold tracking-tight">Absolo Cloud</span>
          </div>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>
            Welcome back. Sign in to manage your projects.
          </CardDescription>
        </CardHeader>
        <form onSubmit={form.handleSubmit((v) => signInMutation.mutate(v))}>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                aria-invalid={!!form.formState.errors.email}
                {...form.register('email')}
              />
              {form.formState.errors.email && (
                <p className="text-xs text-danger-600">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-fg-muted hover:text-fg"
                >
                  Forgot?
                </Link>
              </div>
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                aria-invalid={!!form.formState.errors.password}
                trailingAddon={
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="pointer-events-auto rounded p-0.5 text-fg-muted hover:text-fg"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                }
                {...form.register('password')}
              />
              {form.formState.errors.password && (
                <p className="text-xs text-danger-600">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button
              type="submit"
              className="w-full"
              loading={signInMutation.isPending}
            >
              Sign in
            </Button>
            <p className="text-center text-xs text-fg-muted">
              No account?{' '}
              <a
                href="https://absolo.cloud/sign-up"
                className="text-fg underline-offset-4 hover:underline"
              >
                Start free
              </a>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
