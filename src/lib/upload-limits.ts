// Upload size limits, shared by the server (which enforces them) and the
// upload forms (which check before sending). Nothing here may import a
// server-only module: client components read these numbers too.

const MB = 1024 * 1024;

/** Profile photos and product images. */
export const MAX_IMAGE_BYTES = 5 * MB;

/** Theme artwork is printed, so it is allowed to be larger. */
export const MAX_THEME_ART_BYTES = 10 * MB;

/**
 * The Server Action request body cap (next.config.ts).
 *
 * Next.js refuses anything over its 1 MB default before an action runs, so a
 * limit set only in the action is never reached: a 2 MB phone photo — well
 * inside the promised 5 MB — crashed the page instead of uploading. This is
 * the largest upload plus room for the multipart envelope and the other
 * fields posted alongside it.
 */
export const ACTION_BODY_LIMIT_BYTES = MAX_THEME_ART_BYTES + MB / 2;

export function oversizeMessage(maxBytes: number): string {
  return `Image is larger than ${Math.round(maxBytes / MB)} MB.`;
}

/** The message for the first file over the limit, or null if they all fit. */
export function firstOversize(sizes: number[], maxBytes: number): string | null {
  return sizes.some((size) => size > maxBytes) ? oversizeMessage(maxBytes) : null;
}

/**
 * Check a form's chosen files before it is submitted. Returns the message to
 * show, having cancelled the submission, or null to let it go ahead — a file
 * over the action body cap would otherwise fail inside the framework with no
 * useful message.
 */
export function blockOversizeSubmit(
  event: { currentTarget: HTMLFormElement; preventDefault(): void },
  maxBytes: number,
): string | null {
  const sizes: number[] = [];
  for (const input of event.currentTarget.querySelectorAll<HTMLInputElement>('input[type="file"]')) {
    for (const file of input.files ?? []) sizes.push(file.size);
  }
  const message = firstOversize(sizes, maxBytes);
  if (message) event.preventDefault();
  return message;
}
