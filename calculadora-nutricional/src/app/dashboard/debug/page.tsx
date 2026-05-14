import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

type ColumnRow = {
    column_name: string;
};

export default async function DebugPage() {
    const session = await getServerSession(authOptions);
    if (!session) redirect("/login");

    let columns: ColumnRow[] = [];
    let error: string | null = null;

    try {
        // Query information_schema to check if columns exist
        columns = await prisma.$queryRaw`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'CustomIngredient';
        `;
    } catch (e: unknown) {
        error = e instanceof Error ? e.message : String(e);
    }

    return (
        <div className="container mx-auto py-10 px-4">
            <h1 className="text-2xl font-bold mb-6">Database Debug Info</h1>

            {error ? (
                <div className="bg-red-100 p-4 rounded text-red-900 border border-red-200">
                    <h2 className="font-bold">Connection Error:</h2>
                    <pre className="whitespace-pre-wrap text-xs mt-2">{error}</pre>
                </div>
            ) : (
                <div className="bg-green-50 p-4 rounded border border-green-200">
                    <h2 className="font-bold text-green-800 mb-2">Connection Successful</h2>
                    <p className="mb-2">Found {columns.length} columns in CustomIngredient table.</p>

                    <h3 className="font-semibold mt-4 mb-2">Columns Found:</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {columns.map((col) => (
                            <div key={col.column_name} className="bg-white p-2 rounded shadow-sm text-sm border">
                                {col.column_name}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
