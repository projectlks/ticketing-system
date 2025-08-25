import Swal from "sweetalert2";

export function useRestore() {
    const handleRestore = async <
        T extends { id: string; isArchived?: boolean },
        R = unknown  // <- any return type for backend function
    >(
        id: string,
        setItems: React.Dispatch<React.SetStateAction<T[]>>,
        restoreAction: (id: string) => Promise<R> // <- allow any return type
    ) => {
        try {
            const result = await Swal.fire({
                title: "Are you sure?",
                text: "Do you want to restore this item?",
                icon: "warning",
                showCancelButton: true,
                confirmButtonColor: "#3085d6",
                cancelButtonColor: "#d33",
                confirmButtonText: "Yes, restore it!",
            });

            if (result.isConfirmed) {
                await restoreAction(id); // we don’t care what it returns

                setItems((prev) =>
                    prev.map((item) =>
                        item.id === id ? { ...item, isArchived: false } : item
                    )
                );

                Swal.fire({
                    title: "Restored!",
                    text: "The item has been restored.",
                    icon: "success",
                    timer: 1500,
                    showConfirmButton: false,
                });
            }
        } catch (error) {
            console.error("Failed to restore item:", error);
            Swal.fire({
                title: "Error!",
                text: "Failed to restore the item.",
                icon: "error",
            });
        }
    };

    return { handleRestore };
}
