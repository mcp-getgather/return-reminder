type ButtonProps = {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  name?: string;
};

export default function Button({
  children,
  disabled,
  onClick,
  name,
}: ButtonProps) {
  return (
    <button
      key={name + '-click'}
      type="submit"
      disabled={disabled}
      onClick={onClick}
      className={`px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      {children}
    </button>
  );
}
