interface InputProps {
    type?: string;
    id: string;
    name: string;
    placeholder: string;
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    error?: boolean;
    label: string
    require: boolean
    errorMessage: string
    disable: boolean
}

export default function Input({
    type = "text",
    id,
    name,
    placeholder,
    value,
    onChange,
    error,
    label,
    require = false,
    errorMessage,
    disable = false

}: InputProps) {
    return (

        <>

            <div>
                <label
                    htmlFor={id}
                    className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-200"
                >
                    {label} {require && (<span className="text-red-500">*</span>)}
                </label>
                <input
                    disabled={!!disable}
                    type={type}
                    id={id}
                    name={name}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    className={`h-11 w-full rounded-lg border ${error ? "border-red-500" : "border-gray-300 dark:border-gray-600"} bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300/50`}
                />
                {errorMessage && (
                    <p id="name-error" className="text-red-600 text-sm mt-1" role="alert">
                        {errorMessage}
                    </p>
                )}
            </div>



        </>
    );
}
