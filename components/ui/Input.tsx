import { forwardRef, useId } from "react";
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { cx } from "./utils";

type FieldChromeProps = {
  description?: ReactNode;
  error?: ReactNode;
  hideLabel?: boolean;
  label: ReactNode;
};

export type TextInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "aria-describedby"> &
  FieldChromeProps;

export type TextAreaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "aria-describedby"> &
  FieldChromeProps;

function FieldChrome({
  children,
  className,
  description,
  error,
  hideLabel,
  inputId,
  label
}: FieldChromeProps & {
  children: ReactNode;
  className?: string;
  inputId: string;
}) {
  const descriptionId = description ? `${inputId}-description` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <label className={cx("rr-ui-field", className)} htmlFor={inputId}>
      <span className={cx("rr-ui-field__label", hideLabel && "sr-only")}>{label}</span>
      {children}
      {description ? (
        <span className="rr-ui-field__description" id={descriptionId}>
          {description}
        </span>
      ) : null}
      {error ? (
        <span className="rr-ui-field__error" id={errorId}>
          {error}
        </span>
      ) : null}
    </label>
  );
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { className, description, error, hideLabel, id, label, ...props },
  ref
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const describedBy = [description ? `${inputId}-description` : null, error ? `${inputId}-error` : null]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <FieldChrome
      className={className}
      description={description}
      error={error}
      hideLabel={hideLabel}
      inputId={inputId}
      label={label}
    >
      <input
        ref={ref}
        aria-describedby={describedBy}
        aria-invalid={Boolean(error) || undefined}
        className="rr-ui-input"
        id={inputId}
        {...props}
      />
    </FieldChrome>
  );
});

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { className, description, error, hideLabel, id, label, ...props },
  ref
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const describedBy = [description ? `${inputId}-description` : null, error ? `${inputId}-error` : null]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <FieldChrome
      className={className}
      description={description}
      error={error}
      hideLabel={hideLabel}
      inputId={inputId}
      label={label}
    >
      <textarea
        ref={ref}
        aria-describedby={describedBy}
        aria-invalid={Boolean(error) || undefined}
        className="rr-ui-input rr-ui-textarea"
        id={inputId}
        {...props}
      />
    </FieldChrome>
  );
});

