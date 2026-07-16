import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { getServerSession } from "next-auth";
import {
  ArrowRight,
  Calculator,
  Check,
  CircleAlert,
  Database,
  ExternalLink,
  Factory,
  FileDown,
  Leaf,
  Users2,
} from "lucide-react";

import { authOptions } from "@/lib/auth";
import { SAAS_MODULES } from "@/features/saas/domain/modules";
import { contextHasModuleAccess, getCurrentSaaSContext } from "@/features/saas/services/entitlements";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const titleFont = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const bodyFont = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "SoIZI | Rotulagem nutricional sem retrabalho",
  description:
    "Organize ingredientes, calcule a informação nutricional e exporte tabelas em um único fluxo.",
};

const INGREDIENT_EXAMPLES = [
  { name: "Farinha de trigo", detail: "Base de composição cadastrada" },
  { name: "Leite integral", detail: "Quantidade vinculada à formulação" },
  { name: "Cacau em pó", detail: "Dados nutricionais revisáveis" },
];

const NUTRITION_EXAMPLE = [
  { nutrient: "Valor energético", per100g: "386 kcal", portion: "116 kcal" },
  { nutrient: "Carboidratos", per100g: "61 g", portion: "18 g" },
  { nutrient: "Proteínas", per100g: "8,2 g", portion: "2,5 g" },
  { nutrient: "Gorduras totais", per100g: "12 g", portion: "3,6 g" },
];

const EXPORT_FORMATS = [
  { name: "Imagem pronta", detail: "PNG, JPEG ou WEBP para aprovação visual" },
  { name: "Planilha editável", detail: "Excel para conferência e documentação" },
  { name: "Pacote completo", detail: "Arquivos organizados em uma única entrega" },
];

const BENEFITS = [
  {
    title: "Dados em um só lugar",
    description: "Ingredientes, formulação e informação nutricional permanecem conectados.",
  },
  {
    title: "Revisão antes da entrega",
    description: "Compare modelos e confira a tabela antes de gerar os arquivos finais.",
  },
  {
    title: "Trabalho reaproveitável",
    description: "Salve, edite e mantenha o histórico das tabelas dentro do painel.",
  },
];

const AUDIENCE = [
  {
    icon: Factory,
    title: "Indústrias",
    description: "Alinhe desenvolvimento, qualidade, produção e regulatório no mesmo processo.",
  },
  {
    icon: Leaf,
    title: "Marcas de alimentos",
    description: "Conduza lançamentos e atualizações de portfólio com mais organização.",
  },
  {
    icon: Users2,
    title: "Consultorias",
    description: "Atenda diferentes clientes com um fluxo consistente e rastreável.",
  },
];

const DAYANE_HIGHLIGHTS = [
  "Doutora em Tecnologia de Alimentos pela UFPR.",
  "Engenheira de Alimentos e especialista em rotulagem.",
  "Experiência em P&D, assuntos regulatórios, qualidade e segurança de alimentos.",
  "Fundadora da SoIZI Food Solution.",
];

const FAQ = [
  {
    question: "A plataforma calcula por 100 g e por porção?",
    answer:
      "Sim. A formulação pode ser analisada por 100 g ou 100 ml e pela porção definida, incluindo a medida caseira.",
  },
  {
    question: "Consigo revisar a tabela antes de exportar?",
    answer:
      "Sim. O fluxo inclui pré-visualização para conferir dados, apresentação e modelos antes de gerar os arquivos.",
  },
  {
    question: "Quais formatos de entrega estão disponíveis?",
    answer:
      "A plataforma permite gerar imagens, planilha Excel e um pacote organizado com os materiais da tabela.",
  },
  {
    question: "Posso voltar e editar uma tabela já criada?",
    answer:
      "Sim. As tabelas ficam salvas no painel para consulta, ajustes e novas exportações.",
  },
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <Badge variant="outline" className="uppercase tracking-[0.16em]">
      {children}
    </Badge>
  );
}

export default async function Home() {
  const session = await getServerSession(authOptions);
  const isLoggedIn = Boolean(session);
  const context = isLoggedIn ? await getCurrentSaaSContext() : null;
  const canUseTables = Boolean(context && contextHasModuleAccess(context, SAAS_MODULES.TABLES));

  const primaryHref = isLoggedIn ? "/dashboard" : "/register";
  const primaryLabel = isLoggedIn ? "Abrir meu painel" : "Criar minha conta";
  const secondaryHref = isLoggedIn && canUseTables ? "/dashboard/new" : isLoggedIn ? "/dashboard" : "/login";
  const secondaryLabel = isLoggedIn && canUseTables ? "Nova tabela" : isLoggedIn ? "Voltar ao painel" : "Já tenho conta";

  return (
    <div className={`${bodyFont.className} bg-background text-foreground`}>
      <section
        id="inicio"
        className="relative isolate min-h-[calc(100svh-4.5rem)] overflow-hidden"
      >
        <Image
          src="https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=2000&q=88"
          alt="Equipe preparando alimentos em uma cozinha profissional"
          fill
          priority
          className="hero-image-drift object-cover object-center"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/82 via-black/58 to-black/20" />
        <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/45 to-transparent" />

        <div className="relative mx-auto flex min-h-[calc(100svh-4.5rem)] w-full max-w-7xl items-end px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
          <div className="app-enter max-w-4xl text-white">
            <Badge className="mb-6">SoIZI · Sistema de rotulagem</Badge>
            <h1
              className={`${titleFont.className} max-w-4xl text-balance text-5xl leading-[0.92] sm:text-6xl lg:text-8xl`}
            >
              Da formulação ao rótulo, sem perder o fio.
            </h1>
            <p className="app-enter app-enter-delay-1 mt-6 max-w-2xl text-balance text-base leading-7 text-white/90 sm:text-lg">
              Organize ingredientes, calcule a informação nutricional e prepare a entrega em um fluxo claro para toda a equipe.
            </p>
            <div className="app-enter app-enter-delay-2 mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href={primaryHref}>
                  {primaryLabel}
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href={secondaryHref}>{secondaryLabel}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <main>
        <section
          id="o-que-fazemos"
          className="mx-auto grid w-full max-w-7xl scroll-mt-24 gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[0.72fr_1.28fr] lg:items-start lg:px-8 lg:py-28"
        >
          <div className="lg:sticky lg:top-28">
            <Eyebrow>O fluxo</Eyebrow>
            <h2 className={`${titleFont.className} mt-5 text-balance text-4xl leading-tight sm:text-5xl lg:text-6xl`}>
              Um processo que mostra onde você está.
            </h2>
            <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground">
              Cada etapa mantém o contexto da anterior. Você trabalha na formulação, revisa o cálculo e prepara a entrega sem espalhar informações.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-4">
              <div>
                <p className={`${titleFont.className} text-3xl font-semibold`}>100 g</p>
                <p className="mt-1 text-xs text-muted-foreground">Base de cálculo</p>
              </div>
              <div>
                <p className={`${titleFont.className} text-3xl font-semibold`}>%VD</p>
                <p className="mt-1 text-xs text-muted-foreground">Leitura nutricional</p>
              </div>
              <div>
                <p className={`${titleFont.className} text-3xl font-semibold`}>PNG</p>
                <p className="mt-1 text-xs text-muted-foreground">Entrega visual</p>
              </div>
            </div>
          </div>

          <Card className="overflow-hidden py-0">
            <CardHeader className="border-b py-6">
              <CardTitle>Da base ao arquivo final</CardTitle>
              <CardDescription>Uma amostra visual do fluxo de trabalho.</CardDescription>
              <CardAction>
                <Badge variant="secondary">3 etapas</Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="px-0">
              <Tabs defaultValue="ingredientes" className="gap-0">
                <div className="border-b px-4 pt-3 sm:px-6">
                  <TabsList variant="line" className="grid w-full grid-cols-3">
                    <TabsTrigger value="ingredientes">
                      <Database aria-hidden="true" />
                      Base
                    </TabsTrigger>
                    <TabsTrigger value="calculo">
                      <Calculator aria-hidden="true" />
                      Cálculo
                    </TabsTrigger>
                    <TabsTrigger value="entrega">
                      <FileDown aria-hidden="true" />
                      Entrega
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="ingredientes" className="p-4 sm:p-6">
                  <ItemGroup className="gap-2">
                    {INGREDIENT_EXAMPLES.map((ingredient, index) => (
                      <Item key={ingredient.name} variant="outline">
                        <ItemMedia variant="icon">{index + 1}</ItemMedia>
                        <ItemContent>
                          <ItemTitle>{ingredient.name}</ItemTitle>
                          <ItemDescription>{ingredient.detail}</ItemDescription>
                        </ItemContent>
                        <Badge variant="outline">Revisado</Badge>
                      </Item>
                    ))}
                  </ItemGroup>
                </TabsContent>

                <TabsContent value="calculo" className="p-4 sm:p-6">
                  <Table>
                    <TableCaption>Valores meramente ilustrativos para apresentar a interface.</TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nutriente</TableHead>
                        <TableHead className="text-right">100 g</TableHead>
                        <TableHead className="text-right">Porção</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {NUTRITION_EXAMPLE.map((row) => (
                        <TableRow key={row.nutrient}>
                          <TableCell className="font-medium">{row.nutrient}</TableCell>
                          <TableCell className="text-right">{row.per100g}</TableCell>
                          <TableCell className="text-right">{row.portion}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>

                <TabsContent value="entrega" className="p-4 sm:p-6">
                  <ItemGroup className="gap-2">
                    {EXPORT_FORMATS.map((format) => (
                      <Item key={format.name} variant="muted">
                        <ItemMedia variant="icon">
                          <FileDown aria-hidden="true" />
                        </ItemMedia>
                        <ItemContent>
                          <ItemTitle>{format.name}</ItemTitle>
                          <ItemDescription>{format.detail}</ItemDescription>
                        </ItemContent>
                        <Badge variant="secondary">
                          <Check aria-hidden="true" />
                          Disponível
                        </Badge>
                      </Item>
                    ))}
                  </ItemGroup>
                </TabsContent>
              </Tabs>
            </CardContent>
            <CardFooter className="border-t p-4 sm:p-6">
              <Alert>
                <CircleAlert aria-hidden="true" />
                <AlertTitle>Decisão técnica continua humana</AlertTitle>
                <AlertDescription>
                  A plataforma organiza e automatiza o fluxo; a revisão profissional permanece parte da entrega.
                </AlertDescription>
              </Alert>
            </CardFooter>
          </Card>
        </section>

        <Separator />

        <section
          id="sobre-nos"
          className="mx-auto grid w-full max-w-7xl scroll-mt-24 gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:px-8 lg:py-28"
        >
          <AspectRatio ratio={4 / 5} className="group overflow-hidden rounded-xl bg-muted lg:order-1">
            <Image
              src="https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1400&q=86"
              alt="Ingredientes frescos organizados sobre uma mesa"
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-[1.025]"
              sizes="(max-width: 1024px) 100vw, 52vw"
            />
          </AspectRatio>

          <div className="lg:order-2">
            <Eyebrow>Sobre a SoIZI</Eyebrow>
            <h2 className={`${titleFont.className} mt-5 text-balance text-4xl leading-tight sm:text-5xl lg:text-6xl`}>
              Tecnologia com repertório de indústria.
            </h2>
            <p className="mt-5 text-base leading-7 text-muted-foreground">
              A SoIZI aproxima conhecimento regulatório e execução. O sistema foi desenhado para transformar dados técnicos em um processo mais legível, revisável e prático.
            </p>

            <ItemGroup className="mt-8 gap-3">
              {BENEFITS.map((benefit) => (
                <Item key={benefit.title} variant="outline">
                  <ItemMedia variant="icon">
                    <Check aria-hidden="true" />
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle>{benefit.title}</ItemTitle>
                    <ItemDescription>{benefit.description}</ItemDescription>
                  </ItemContent>
                </Item>
              ))}
            </ItemGroup>
          </div>
        </section>

        <section className="border-y bg-muted/30">
          <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <Eyebrow>Feito para equipes reais</Eyebrow>
                <h2 className={`${titleFont.className} mt-5 text-4xl leading-tight sm:text-5xl`}>
                  Diferentes rotinas. O mesmo fio condutor.
                </h2>
              </div>
              <p className="max-w-md text-sm leading-6 text-muted-foreground">
                A organização muda conforme o negócio, mas a informação precisa continuar clara para todos.
              </p>
            </div>

            <ItemGroup className="mt-10 grid gap-3 md:grid-cols-3">
              {AUDIENCE.map((audience) => (
                <Item key={audience.title} variant="outline" className="items-start">
                  <ItemMedia variant="icon">
                    <audience.icon aria-hidden="true" />
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle>{audience.title}</ItemTitle>
                    <ItemDescription>{audience.description}</ItemDescription>
                  </ItemContent>
                </Item>
              ))}
            </ItemGroup>
          </div>
        </section>

        <section
          id="dayane"
          className="mx-auto grid w-full max-w-7xl scroll-mt-24 gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[0.88fr_1.12fr] lg:items-center lg:px-8 lg:py-28"
        >
          <AspectRatio ratio={1} className="overflow-hidden rounded-xl bg-muted">
            <Image
              src="https://images.unsplash.com/photo-1684259498900-afdea87b1a97?auto=format&fit=crop&w=1200&q=86"
              alt="Profissional analisando frutas em um laboratório de alimentos"
              fill
              className="object-cover object-center"
              sizes="(max-width: 1024px) 100vw, 42vw"
            />
          </AspectRatio>

          <div>
            <Eyebrow>Conhecimento aplicado</Eyebrow>
            <h2 className={`${titleFont.className} mt-5 text-balance text-4xl leading-tight sm:text-5xl lg:text-6xl`}>
              Experiência técnica transformada em ferramenta.
            </h2>
            <p className="mt-5 text-base leading-7 text-muted-foreground">
              Dayane Rosalyn Izidoro Plocharski construiu sua trajetória entre pesquisa, indústria, qualidade e desenvolvimento de produtos. Na SoIZI, essa experiência orienta uma tecnologia feita para o trabalho cotidiano.
            </p>

            <div className="mt-6 flex items-center gap-3">
              <Avatar size="lg" className="border">
                <AvatarImage
                  src="https://unavatar.io/linkedin/doutoraday"
                  alt="Dayane Rosalyn Izidoro Plocharski"
                />
                <AvatarFallback>DI</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold">Dayane Izidoro</p>
                <p className="text-sm text-muted-foreground">Engenheira e Doutora em Tecnologia de Alimentos</p>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-4">
              {DAYANE_HIGHLIGHTS.map((highlight, index) => (
                <div key={highlight}>
                  <div className="flex items-start gap-3">
                    <Badge variant="secondary">0{index + 1}</Badge>
                    <p className="text-sm leading-6">{highlight}</p>
                  </div>
                  {index < DAYANE_HIGHLIGHTS.length - 1 ? <Separator className="mt-4" /> : null}
                </div>
              ))}
            </div>

            <Button asChild variant="outline" className="mt-8">
              <Link href="https://linkedin.com/in/doutoraday/" target="_blank" rel="noopener noreferrer">
                Conhecer a trajetória
                <ExternalLink data-icon="inline-end" />
              </Link>
            </Button>
          </div>
        </section>

        <Separator />

        <section className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[0.7fr_1.3fr] lg:px-8 lg:py-24">
          <div>
            <Eyebrow>Dúvidas frequentes</Eyebrow>
            <h2 className={`${titleFont.className} mt-5 text-4xl leading-tight sm:text-5xl`}>
              Antes de começar.
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">
              Respostas diretas sobre o funcionamento da plataforma.
            </p>
          </div>

          <Accordion type="single" collapsible defaultValue="faq-0" className="border-y">
            {FAQ.map((item, index) => (
              <AccordionItem key={item.question} value={`faq-${index}`}>
                <AccordionTrigger className="py-5 text-base">{item.question}</AccordionTrigger>
                <AccordionContent className="max-w-2xl pb-5 leading-6 text-muted-foreground">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        <section id="acesso" className="scroll-mt-24 px-4 pb-6 sm:px-6 lg:px-8">
          <div className="relative mx-auto min-h-[28rem] w-full max-w-7xl overflow-hidden rounded-xl">
            <Image
              src="https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1800&q=86"
              alt="Prato colorido preparado com ingredientes frescos"
              fill
              className="object-cover"
              sizes="(max-width: 1280px) 100vw, 1280px"
            />
            <div className="absolute inset-0 bg-black/62" />
            <div className="relative flex min-h-[28rem] flex-col items-start justify-end p-6 text-white sm:p-10 lg:p-14">
              <Badge className="mb-5">Seu próximo rótulo começa aqui</Badge>
              <h2 className={`${titleFont.className} max-w-3xl text-balance text-4xl leading-tight sm:text-6xl`}>
                Menos retrabalho. Mais clareza em cada entrega.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-6 text-white/90 sm:text-base">
                Entre no painel para continuar seu trabalho ou crie uma conta para montar sua primeira tabela.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link href={primaryHref}>
                    {primaryLabel}
                    <ArrowRight data-icon="inline-end" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="secondary">
                  <Link href={secondaryHref}>{secondaryLabel}</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
