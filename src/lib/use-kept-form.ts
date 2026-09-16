import { startTransition, useCallback, useEffect, useState, type FormEvent } from "react";

/**
 * Submit a form to its action without React wiping what was typed.
 *
 * React 19 resets an uncontrolled `<form action>` after every action — even
 * one that returned an error. A sign-up refused for a taken email came back
 * blank, and a profile refused for one over-long field threw away the rest of
 * the edits. Dispatching from `onSubmit` inside a transition skips that reset;
 * the form keeps its `action` too, so it still posts without JavaScript.
 *
 * Forms that *should* empty after a success (adding a contact, changing a
 * password) pass `clearOnSuccess`, which resets them once the action reports
 * success.
 *
 *   const [formRef, submitForm] = useKeptForm(formAction, state);
 *   <form ref={formRef} action={formAction} onSubmit={submitForm}>
 */
export function useKeptForm(
  dispatch: (payload: FormData) => void,
  state: object,
  clearOnSuccess = false,
) {
  // A callback ref (the element held in state) rather than a ref object, so
  // nothing ref-like is read while rendering the form.
  const [form, ref] = useState<HTMLFormElement | null>(null);

  // Each action call returns a fresh object, so this runs once per result.
  useEffect(() => {
    if (clearOnSuccess && succeeded(state)) form?.reset();
  }, [state, clearOnSuccess, form]);

  const onSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      // Another handler (a file-size check) already cancelled it.
      if (event.defaultPrevented) return;
      event.preventDefault();
      const submitter = (event.nativeEvent as SubmitEvent).submitter;
      const data = new FormData(event.currentTarget, submitter);
      startTransition(() => dispatch(data));
    },
    [dispatch],
  );

  return [ref, onSubmit] as const;
}

/** Action states report success as `success` (a flag or a message) or `ok`. */
function succeeded(state: object): boolean {
  const s = state as { success?: unknown; ok?: unknown };
  return Boolean(s.success ?? s.ok);
}
