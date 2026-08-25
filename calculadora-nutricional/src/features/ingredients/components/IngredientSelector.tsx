'use client'

import * as React from "react"
import { ChevronsUpDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { searchIngredients } from "@/features/ingredients/actions/custom-ingredient-actions";
import type { IngredientDto } from "@/features/ingredients/domain/ingredient-dto";

export function IngredientSelector({ onSelect }: { onSelect: (ing: IngredientDto) => void }) {
    const [open, setOpen] = React.useState(false)
    const [query, setQuery] = React.useState("")
    const [results, setResults] = React.useState<IngredientDto[]>([])
    const [loading, setLoading] = React.useState(false)

    const customResults = React.useMemo(
        () =>
            results.filter((item) => {
                const origin = item.origin
                return origin === "CUSTOM" || item.name.startsWith("[Meu]")
            }),
        [results]
    )

    const officialResults = React.useMemo(
        () =>
            results.filter((item) => {
                const origin = item.origin
                return origin !== "CUSTOM" && !item.name.startsWith("[Meu]")
            }),
        [results]
    )

    // Debounce search (inclui sugestões quando query está vazia)
    React.useEffect(() => {
        if (!open) return

        const timer = setTimeout(async () => {
            setLoading(true)
            try {
                const data = await searchIngredients(query)
                setResults(data)
            } catch (e) {
                console.error(e)
            } finally {
                setLoading(false)
            }
        }, 300)

        return () => clearTimeout(timer)
    }, [query, open])

    React.useEffect(() => {
        if (open) return
        setQuery("")
    }, [open])

    const handleSelect = (item: IngredientDto) => {
        onSelect(item)
        setQuery("")
        setResults([])
        setOpen(false)
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="h-12 w-full justify-between gap-2 rounded-xl border-border/70 bg-background/95 px-3 text-sm shadow-sm hover:bg-accent/40"
                >
                    <span className="truncate text-left">
                        Buscar ingrediente...
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-[min(95vw,32rem)] rounded-xl border-border/70 bg-popover p-0 shadow-xl"
                align="start"
            >
                <Command shouldFilter={false} className="bg-transparent">
                    <CommandInput
                        placeholder="Digite com ou sem acento (ex: acucar, açúcar)..."
                        value={query}
                        onValueChange={setQuery}
                        className="h-11"
                    />
                    <CommandList>
                        {!loading && query.length === 0 && (
                            <div className="px-3 py-2 text-xs text-muted-foreground">
                                Sugestões iniciais para facilitar a escolha.
                            </div>
                        )}

                        {loading && <div className="py-6 text-center text-sm text-muted-foreground">Buscando...</div>}

                        {!loading && results.length === 0 && (
                            <CommandEmpty>Nenhum ingrediente encontrado. Tente outra variação de nome.</CommandEmpty>
                        )}

                        {customResults.length > 0 && (
                            <CommandGroup heading="Meus ingredientes">
                                {customResults.map((item) => (
                                    <CommandItem
                                        key={item.id}
                                        value={item.id}
                                        className="py-2"
                                        onSelect={() => handleSelect(item)}
                                    >
                                        <span className="truncate text-sm">{item.name}</span>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        )}

                        {officialResults.length > 0 && (
                            <CommandGroup heading="Base oficial">
                                {officialResults.map((item) => (
                                    <CommandItem
                                        key={item.id}
                                        value={item.id}
                                        className="py-2"
                                        onSelect={() => handleSelect(item)}
                                    >
                                        <span className="truncate text-sm">{item.name}</span>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
