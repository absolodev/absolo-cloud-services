import type { AbsoloHttp } from '../http.js';
import type {
  LoginRequest,
  PasswordResetConfirm,
  PasswordResetRequest,
  Session,
  SignupRequest,
  User,
} from '@absolo/contracts/auth';

export class AuthClient {
  constructor(private readonly http: AbsoloHttp) {}

  signup(req: SignupRequest): Promise<Session> {
    return this.http.request('POST', '/v1/auth/signup', { body: req });
  }

  login(req: LoginRequest): Promise<Session> {
    return this.http.request('POST', '/v1/auth/login', { body: req });
  }

  logout(): Promise<void> {
    return this.http.request('POST', '/v1/auth/logout');
  }

  /** Returns the current authenticated user, or throws `AbsoloApiError(401)` if no session. */
  me(): Promise<User> {
    return this.http.request('GET', '/v1/auth/me');
  }

  requestPasswordReset(req: PasswordResetRequest): Promise<void> {
    return this.http.request('POST', '/v1/auth/password-reset', { body: req });
  }

  confirmPasswordReset(req: PasswordResetConfirm): Promise<void> {
    return this.http.request('POST', '/v1/auth/password-reset/confirm', { body: req });
  }
}
