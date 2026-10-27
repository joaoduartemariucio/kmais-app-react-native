export type FormState =
    | { readonly status: 'editing' }
    | { readonly status: 'saving' }
    | { readonly status: 'saved' }
    | { readonly status: 'failed'; readonly message: string };

export const FormStates = {
    editing: { status: 'editing' } as FormState,
    saving: { status: 'saving' } as FormState,
    saved: { status: 'saved' } as FormState,
    failed: (message: string): FormState => ({ status: 'failed', message })
};
