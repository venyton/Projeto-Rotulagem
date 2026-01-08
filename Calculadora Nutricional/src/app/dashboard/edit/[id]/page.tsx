import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TableGenerator } from "@/components/TableGenerator";
import { SelectedIngredient } from "@/lib/nutrients";

export default async function EditTablePage({ params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) redirect("/login");

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) redirect("/login");

    const table = await prisma.generatedTable.findUnique({
        where: { id: params.id },
        include: { items: true }
    });

    if (!table || table.userId !== user.id) {
        redirect("/dashboard");
    }

    // Map DB items to SelectedIngredient structure
    // We need to fetch the original Ingredient data to fully populate correct references if needed,
    // but the TableItem snapshot has the nutritional data used at the time.
    // However, our system relies on Ingredient objects for the calculation logic if we add more.
    // For now, we reconstruct a "Mock" ingredient from the snapshot to allow editing.

    const ingredients: SelectedIngredient[] = table.items.map(item => ({
        quantity: item.quantity,
        isAddedSugar: item.isAddedSugar,
        ingredient: {
            id: "snapshot-" + item.id, // Pseudo-ID
            name: item.name,
            origin: "snapshot", // Add mock origin
            energy: item.energy,
            protein: item.protein,
            carbs: item.carbs,
            fatTotal: item.fatTotal,
            fatSat: item.fatSat,
            fatTrans: item.fatTrans,
            fiber: item.fiber,
            sodium: item.sodium,
            sugarTotal: item.sugarTotal,
            // Defaults for missing fields in snapshot
            humidity: 0,
            ashes: 0,
            nitrogen: 0,
            calcium: 0,
            magnesium: 0,
            manganese: 0,
            phosphorus: 0,
            iron: 0,
            potassium: 0,
            copper: 0,
            zinc: 0,
            catRef: "",
            catDesc: "",
            userId: null,
            createdAt: new Date(),
            updatedAt: new Date()
        }
    }));

    const initialData = {
        id: table.id,
        title: table.title,
        portionSize: table.portion,
        householdMeasure: table.householdMeasure,
        popGroup: table.popGroup,
        ingredients
    };

    return (
        <div className="container mx-auto py-8">
            <h1 className="text-3xl font-bold mb-6">Editar Tabela</h1>
            <TableGenerator initialData={initialData} />
        </div>
    );
}
