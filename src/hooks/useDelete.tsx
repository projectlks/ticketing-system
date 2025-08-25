import { useSession } from "next-auth/react";
import Swal from "sweetalert2";

export function useDelete() {
    const { data } = useSession();

    const handleDelete = async <
        T extends { id: string; isArchived?: boolean },
        R = unknown
    >(
        id: string,
        setItems: React.Dispatch<React.SetStateAction<T[]>>,
        deleteAction: (id: string) => Promise<R>
    ) => {
        try {
            const result = await Swal.fire({
                title: "Are you sure?",
                text: "You won’t be able to revert this!",
                icon: "warning",
                showCancelButton: true,
                confirmButtonColor: "#d33",
                cancelButtonColor: "#3085d6",
                confirmButtonText: "Yes, delete it!",
            });

            if (result.isConfirmed) {
                // call backend delete
                await deleteAction(id);

                // update UI depending on role
                if (data?.user.role === "SUPER_ADMIN") {
                    // mark as archived
                    setItems((prev) =>
                        prev.map((item) =>
                            item.id === id ? { ...item, isArchived: true } : item
                        )
                    );
                } else {
                    // remove from list
                    setItems((prev) => prev.filter((item) => item.id !== id));
                }

                Swal.fire({
                    title: "Deleted!",
                    text: "The item has been deleted.",
                    icon: "success",
                    timer: 1500,
                    showConfirmButton: false,
                });
            }
        } catch (error) {
            console.error("Failed to delete item:", error);
            Swal.fire({
                title: "Error!",
                text: "Failed to delete the item.",
                icon: "error",
            });
        }
    };

    return { handleDelete };
}
