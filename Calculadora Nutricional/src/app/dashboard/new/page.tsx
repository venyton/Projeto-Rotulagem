import { TableGenerator } from "@/components/TableGenerator";

export default function NewTablePage() {
    return (
        <div className="container mx-auto py-8">
            <h1 className="text-3xl font-bold mb-6">Nova Tabela Nutricional</h1>
            <TableGenerator />
        </div>
    );
}
