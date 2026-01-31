/**
 * Minimal field API shape for string-valued form fields.
 * Matches the subset of @tanstack/react-form's FieldApi used by select components.
 */
export interface StringFieldApi {
  name: string;
  state: {
    value: string;
    meta: {
      isTouched: boolean;
      isValid: boolean;
      errors: Array<{ message?: string } | undefined>;
    };
  };
  handleChange: (value: string) => void;
  handleBlur: () => void;
}
