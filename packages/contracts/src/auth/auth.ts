import { z } from 'zod';
import { IdSchema, TimestampSchema } from '../common/primitives.js';

/**
 * Email address. Lowercased on emit and on input (server normalises).
 */
export const EmailSchema = z.string().email().toLowerCase().max(254);

/**
 * Password input. Server enforces minimum entropy via zxcvbn (score ≥ 3) on top
 * of these baseline length rules; the schema only catches obvious violations
 * before they hit the password-strength service.
 */
export const PasswordSchema = z.string().min(12).max(256);

export const SignupRequestSchema = z
  .object({
    email: EmailSchema,
    password: PasswordSchema,
    fullName: z.string().min(1).max(120),
    /** Marketing opt-in (Cookie banner-respecting). */
    marketingOptIn: z.boolean().default(false),
    /** Server-issued challenge response (e.g., hCaptcha / Turnstile). */
    captchaToken: z.string().min(1),
  })
  .strict();
export type SignupRequest = z.infer<typeof SignupRequestSchema>;

export const LoginRequestSchema = z
  .object({
    email: EmailSchema,
    password: PasswordSchema,
    /** Optional MFA code if the account has TOTP enabled. */
    mfaCode: z.string().regex(/^\d{6}$/).optional(),
  })
  .strict();
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const UserSchema = z
  .object({
    id: IdSchema,
    email: EmailSchema,
    fullName: z.string(),
    avatarUrl: z.string().url().nullable(),
    mfaEnabled: z.boolean(),
    emailVerifiedAt: TimestampSchema.nullable(),
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
  })
  .strict();
export type User = z.infer<typeof UserSchema>;

/**
 * Session emitted to the client after a successful login or signup.
 * The actual session token is delivered via httpOnly cookie; the body only
 * exposes metadata so the client can react to expiry without parsing it.
 */
export const SessionSchema = z
  .object({
    user: UserSchema,
    expiresAt: TimestampSchema,
    /** Capabilities granted to this session (compact; expanded server-side). */
    scopes: z.array(z.string()),
  })
  .strict();
export type Session = z.infer<typeof SessionSchema>;

export const PasswordResetRequestSchema = z
  .object({
    email: EmailSchema,
  })
  .strict();
export type PasswordResetRequest = z.infer<typeof PasswordResetRequestSchema>;

export const PasswordResetConfirmSchema = z
  .object({
    /** Single-use, time-limited reset token from the email link. */
    token: z.string().min(20).max(512),
    newPassword: PasswordSchema,
  })
  .strict();
export type PasswordResetConfirm = z.infer<typeof PasswordResetConfirmSchema>;
