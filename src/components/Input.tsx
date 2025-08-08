interface InputProps {
    type?: string;
    id: string;
    name: string;
    placeholder: string;
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    error?: boolean;
}

export default function Input({
    type = "text",
    id,
    name,
    placeholder,
    value,
    onChange,
    error,
}: InputProps) {
    return (
        <input
            type={type}
            id={id}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className={`h-11 w-full rounded-lg border ${error ? "border-red-500" : "border-gray-300"} bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300/50`}
        />
    );
}
