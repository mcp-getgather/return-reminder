import { useRef } from 'react';

type InputFieldProps = {
  name: string;
  type: string;
  prompt?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  autoFocus?: boolean;
};

export default function InputField({
  name,
  type,
  prompt,
  value,
  onChange,
  disabled,
  autoFocus,
}: InputFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">
        {prompt || name}
      </label>

      <input
        autoFocus={autoFocus}
        ref={inputRef}
        key={name}
        type={type === 'text' ? 'text' : type}
        name={name}
        disabled={disabled}
        value={value}
        onChange={onChange}
        className={`mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm ${
          disabled ? 'home-input-disabled' : ''
        }`}
      />
    </div>
  );
}
