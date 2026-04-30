import { ulid } from 'ulidx';

/**
 * Generate a prefixed-ULID resource ID.
 * Matches `@absolo/contracts/common` `IdSchema`.
 *
 * Lowercase prefix, underscore separator, then 26-char Crockford-base32 ULID.
 *
 * @example
 *   newId('prj') // "prj_01HZX9ABCDEFGHJKMNPQRSTVWX"
 */
export function newId<P extends string>(prefix: P): `${P}_${string}` {
  return `${prefix}_${ulid()}` as `${P}_${string}`;
}
