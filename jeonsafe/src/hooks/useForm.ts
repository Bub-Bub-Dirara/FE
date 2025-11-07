// src/hooks/useForm.ts
import { useEffect, useRef, useState, type ChangeEvent } from "react";

interface UseFormProps<T> {
  initialValue: T;
  validate: (values: T) => Record<keyof T, string>;
}

function useForm<T>({ initialValue, validate }: UseFormProps<T>) {
  const initialRef = useRef<T>(initialValue);

  const [values, setValues] = useState<T>(initialRef.current);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (name: keyof T, text: string) => {
    setValues((prev) => ({ ...prev, [name]: text }));
  };

  const handleBlur = (name: keyof T) => {
    setTouched((prev) => ({ ...prev, [name as string]: true }));
  };

  const getInputProps = (name: keyof T) => {
    const value = values[name];
    const onChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      handleChange(name, e.target.value);
    const onBlur = () => handleBlur(name);
    return { value, onChange, onBlur };
  };

  const reset = () => {
    setValues(initialRef.current);
    setTouched({});
    setErrors({});
  };

  useEffect(() => {
    const newErrors = validate(values) || {};
    setErrors(newErrors);
  }, [validate, values]);

  return { values, errors, touched, getInputProps, setValues, reset, setTouched };
}

export default useForm;