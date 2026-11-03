"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { toast } from "sonner";
import { sections, sectionKeys, type ProductSheet, type SectionKey } from "@/features/product-technical-sheets/domain/product-sheet";
import { deleteProductLegislation, saveProductLegislation, saveProductSheet } from "@/features/product-technical-sheets/actions/product-sheet-actions";

type Law = { id: string; number: string; title: string };
export function ProductSheetEditor({ tableId, title, initial, initialLaws, isNew, lockedLabels }: { tableId: string; title: string; initial: ProductSheet; initialLaws: Law[]; isNew: boolean; lockedLabels: string[] }) {
  const [sheet, setSheet] = useState(initial);
  const [laws, setLaws] = useState(initialLaws);
  const [number, setNumber] = useState("");
  const [lawTitle, setLawTitle] = useState("");
  const [editing, setEditing] = useState<string | undefined>();
  const [dirty, setDirty] = useState(isNew);
  const editVersion = useRef(0);
  const [pending, start] = useTransition();
  const update = (next: ProductSheet) => { editVersion.current += 1; setSheet(next); setDirty(true); };
  const save = () => start(async () => {
    const version = editVersion.current;
    const result = await saveProductSheet(tableId, sheet);
    if (result.error) toast.error(result.error); else { if (editVersion.current === version) setDirty(false); toast.success("Ficha salva."); }
  });
  const saveLaw = () => start(async () => {
    const result = await saveProductLegislation({ id: editing, number, title: lawTitle });
    if (result.error || !result.law) { toast.error(result.error || "Não foi possível salvar."); return; }
    const law = result.law;
    setLaws(current => [...current.filter(item => item.id !== law.id), law]);
    setNumber(""); setLawTitle(""); setEditing(undefined);
    toast.success("Legislação salva.");
  });
  const url = `/api/export/memorial?tableId=${encodeURIComponent(tableId)}&document=technical&format=pdf`;
  return <div className="flex flex-col gap-6">
    <p className="text-muted-foreground">Revise os dados de {title}. A tabela nutricional é calculada a partir da versão salva. Os campos vazios aparecerão como não informados. O modelo resumido inclui identificação, rotulagem, conservação, validade e controle do documento.</p>
    <Field><FieldLabel htmlFor="sheet-logo">Logomarca da empresa (JPEG, PNG ou WebP, até 100 KB)</FieldLabel><Input id="sheet-logo" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 100_000 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) { toast.error("Escolha uma imagem JPEG, PNG ou WebP de até 100 KB."); return; } const reader = new FileReader(); reader.onload = () => { const value = typeof reader.result === "string" ? reader.result.split(",")[1] : ""; update({ ...sheet, logo: value }); }; reader.onerror = () => toast.error("Não foi possível ler a imagem."); reader.readAsDataURL(file); }} />{sheet.logo && <Button type="button" variant="outline" onClick={() => update({ ...sheet, logo: "" })}>Remover logomarca</Button>}</Field>
    <fieldset className="flex flex-wrap gap-4"><legend className="font-medium">Modelo</legend>{([['complete', 'Completo'], ['summary', 'Resumido']] as const).map(([value, label]) => <label key={value} className="flex items-center gap-2"><input type="radio" name="template" checked={sheet.template === value} onChange={() => update({ ...sheet, template: value })} />{label}</label>)}</fieldset>
    <fieldset className="flex flex-wrap gap-4"><legend className="font-medium">Blocos incluídos</legend>{sectionKeys.map(key => <label key={key} className="flex items-center gap-2"><Checkbox checked={!sheet.hidden.includes(key)} onCheckedChange={checked => update({ ...sheet, hidden: checked === true ? sheet.hidden.filter(item => item !== key) : [...sheet.hidden, key] })} />{sections[key].label}</label>)}</fieldset>
    {sectionKeys.map(section => <details key={section} className="rounded-lg bg-card p-4"><summary className="cursor-pointer font-semibold">{sections[section].label}</summary><FieldGroup className="mt-4">{Object.entries(sections[section].fields).map(([key, label]) => <Field key={key}><FieldLabel htmlFor={`sheet-${key}`}>{label}</FieldLabel>{lockedLabels.includes(key) && <p className="text-sm text-muted-foreground">Redação da versão aprovada do rótulo. Edite no módulo de rotulagem.</p>}<Textarea id={`sheet-${key}`} readOnly={lockedLabels.includes(key)} maxLength={4000} value={sheet.fields[key] || ""} onChange={event => update({ ...sheet, fields: { ...sheet.fields, [key]: event.target.value } })} /></Field>)}</FieldGroup></details>)}
    <section className="flex flex-col gap-4 rounded-lg bg-card p-4"><h2 className="text-lg font-semibold">Legislações</h2><p className="text-sm text-muted-foreground">Cadastre referências da organização e escolha a seção em que cada uma será citada. Confira vigência e aplicabilidade antes de usar.</p><FieldGroup><Field><FieldLabel htmlFor="law-number">Número da norma</FieldLabel><Input id="law-number" value={number} maxLength={160} onChange={e => setNumber(e.target.value)} /></Field><Field><FieldLabel htmlFor="law-title">Título da norma</FieldLabel><Input id="law-title" value={lawTitle} maxLength={500} onChange={e => setLawTitle(e.target.value)} /></Field></FieldGroup><Button type="button" variant="outline" disabled={pending} onClick={saveLaw}>{editing ? "Atualizar legislação" : "Incluir legislação"}</Button>
      {laws.map(law => <div key={law.id} className="flex flex-col gap-3 rounded-md bg-muted p-3"><p>{law.number} — {law.title}</p><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => { setEditing(law.id); setNumber(law.number); setLawTitle(law.title); }}>Editar referência</Button><Button type="button" variant="outline" disabled={pending} onClick={() => { if (!window.confirm("Excluir esta referência do cadastro? Ela deixará de ser exibida nas fichas que a citam.")) return; start(async () => { const result = await deleteProductLegislation(law.id); if (result.error) toast.error(result.error); else { setLaws(current => current.filter(item => item.id !== law.id)); update({ ...sheet, laws: sheet.laws.filter(item => item.id !== law.id) }); } }); }}>Excluir</Button><Button type="button" variant="outline" disabled={sheet.laws.some(item => item.id === law.id)} onClick={() => update({ ...sheet, laws: [...sheet.laws, { id: law.id, section: "microbiological", note: "" }] })}>Selecionar</Button></div>{sheet.laws.filter(item => item.id === law.id).map(item => <FieldGroup key={item.id}><Field><FieldLabel htmlFor={`section-${law.id}`}>Seção da citação</FieldLabel><select id={`section-${law.id}`} className="rounded-md border bg-background p-2" value={item.section} onChange={e => update({ ...sheet, laws: sheet.laws.map(entry => entry.id === law.id ? { ...entry, section: e.target.value as SectionKey } : entry) })}>{sectionKeys.map(key => <option key={key} value={key}>{sections[key].label}</option>)}</select></Field><Field><FieldLabel htmlFor={`note-${law.id}`}>Observação</FieldLabel><Textarea id={`note-${law.id}`} maxLength={1000} value={item.note} onChange={e => update({ ...sheet, laws: sheet.laws.map(entry => entry.id === law.id ? { ...entry, note: e.target.value } : entry) })} /></Field><Button type="button" variant="outline" onClick={() => update({ ...sheet, laws: sheet.laws.filter(entry => entry.id !== law.id) })}>Remover seleção</Button></FieldGroup>)}</div>)}
    </section>
    <div className="flex flex-wrap gap-3"><Button type="button" disabled={pending} onClick={save}>{pending ? "Salvando..." : "Salvar ficha"}</Button><Button type="button" variant="outline" disabled={dirty || pending} onClick={() => { window.open(`${url}&preview=1`, "_blank", "noopener,noreferrer"); }}>Pré-visualizar PDF</Button><Button type="button" variant="outline" disabled={dirty || pending} onClick={() => { const link = document.createElement("a"); link.href = url; link.download = "ficha-tecnica.pdf"; link.click(); }}>Baixar PDF</Button></div>{dirty && <p role="status" className="text-sm text-muted-foreground">Salve as alterações para atualizar a prévia e o PDF.</p>}
  </div>;
}
