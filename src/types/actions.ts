/** Result returned by every Server Action that is called from a form. */
export interface ActionState {
  error?: string;
  success?: string;
  /** Where the browser should go next (set by login and password reset). */
  redirectTo?: string;
}