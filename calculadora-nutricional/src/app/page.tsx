import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CheckCircle2, Factory, Leaf, Users2 } from "lucide-react";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { Button } from "@/components/ui/button";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const titleFont = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const bodyFont = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const BENEFITS = [
  "Fluxo claro para montar a tabela sem perder tempo.",
  "Baseado em regras oficiais para reduzir retrabalho.",
  "Exportação prática para operação, revisão e produção.",
];

const AUDIENCE = [
  {
    icon: Factory,
    title: "Indústrias e fábricas",
    text: "Mais consistência para o time técnico e mais velocidade na entrega.",
  },
  {
    icon: Leaf,
    title: "Marcas de alimentos",
    text: "Lançamentos com mais segurança e apresentação profissional.",
  },
  {
    icon: Users2,
    title: "Consultorias",
    text: "Processo organizado para atender múltiplos clientes com qualidade.",
  },
];

const DAYANE_HIGHLIGHTS = [
  "Dra. em Tecnologia de Alimentos (UFPR), Engenheira de Alimentos e especialista em Rotulagem.",
  "Atuação em R&D, Assuntos Regulatórios, Segurança de Alimentos, RT e consultoria técnica.",
  "Sócia-proprietária da SoIZI Food Solution, com foco em PD&I, regulatório e qualidade.",
  "Professora, consultora e comunicadora técnica com linguagem prática para a indústria.",
];

const DAYANE_TRAJECTORY = [
  "Graduação em Engenharia de Alimentos na UNICENTRO (2003).",
  "Mestrado em Tecnologia de Alimentos pela UFPR (2005-2007).",
  "Doutorado em Tecnologia de Alimentos pela UFPR (2007-2011).",
  "14 anos de trajetória na Nutrimental, incluindo liderança em Qualidade e Desenvolvimento.",
  "Fundação da SoIZI Food Solution em 2021 para apoiar empresas com inteligência regulatória.",
];

const DAYANE_NAME = "Dayane Rosalyn Izidoro Plocharski";
const DAYANE_HEADLINE =
  "Dra. | Food Engineering | Especialista em Rotulagem | R&D | RT | PCQI | Regulatory Affairs | Food Safety | Consultora | Professora";
const DAYANE_LINKEDIN_COVER_FALLBACK =
  "https://media.licdn.com/dms/image/v2/D4D16AQGc1L37LmxXeg/profile-displaybackgroundimage-shrink_200_800/B4DZ3By9WWGQAY-/0/1777072855587?e=1778716800&v=beta&t=D4C3-62Y4T2Ct5mVklY41ZUZhRZ8JUgdeGyjQL1PLPs";

export default async function Home() {
  const session = await getServerSession(authOptions);
  const isLoggedIn = Boolean(session);
  const currentYear = new Date().getFullYear();

  return (
    <div className={`${bodyFont.className} bg-background text-foreground`}>
      <section id="inicio" className="relative isolate min-h-[calc(100svh-4rem)] overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1800&q=80"
          alt="Equipe sorrindo enquanto prepara alimentos"
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/72 via-black/54 to-black/24" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(16,185,129,0.25),transparent_38%)]" />

        <div className="relative mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-7xl items-center px-4 py-14 sm:px-6 lg:px-8">
          <div className="max-w-3xl text-white">
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200/95">
              SoIZI | Sistema de Rotulagem
            </p>

            <h1 className={`${titleFont.className} text-balance text-5xl leading-[0.95] sm:text-6xl lg:text-7xl`}>
              Rotulagem nutricional com cara de trabalho bem feito
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-100/95 sm:text-lg">
              A SoIZI ajuda sua equipe a transformar dados técnicos em tabelas claras, bonitas e prontas para uso,
              mantendo o foco nas diretrizes da ANVISA.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {isLoggedIn ? (
                <>
                  <Button asChild size="lg" className="h-12 rounded-full bg-emerald-500 px-7 text-base font-semibold text-white hover:bg-emerald-400">
                    <Link href="/dashboard">Abrir minhas tabelas</Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="h-12 rounded-full border-white/60 bg-white/12 px-7 text-base font-semibold text-white hover:bg-white/20"
                  >
                    <Link href="/dashboard/ingredients">Ver ingredientes</Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild size="lg" className="h-12 rounded-full bg-emerald-500 px-7 text-base font-semibold text-white hover:bg-emerald-400">
                    <Link href="/register">Começar agora</Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="h-12 rounded-full border-white/60 bg-white/12 px-7 text-base font-semibold text-white hover:bg-white/20"
                  >
                    <Link href="/login">Já tenho conta</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <section id="sobre-nos" className="scroll-mt-24 grid gap-10 lg:grid-cols-[1fr_1.05fr] lg:items-center">
          <div className="relative h-[340px] overflow-hidden rounded-[2.2rem] sm:h-[420px]">
            <Image
              src="https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1400&q=80"
              alt="Mesa com alimentos frescos e coloridos"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 48vw"
            />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
              Sobre nós
            </p>
            <h2 className={`${titleFont.className} mt-3 text-4xl leading-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl`}>
              Um sistema criado para simplificar a rotina da rotulagem
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              A SoIZI nasceu para dar apoio real para quem trabalha com tabela nutricional todos os dias, reduzindo
              retrabalho e organizando o processo de ponta a ponta.
            </p>
            <ul className="mt-6 space-y-4 text-sm text-zinc-700 dark:text-zinc-300 sm:text-base">
              {BENEFITS.map((benefit) => (
                <li key={benefit} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-emerald-600 dark:text-emerald-300" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="sobre-a-soizi" className="mt-18 scroll-mt-24 rounded-[2.3rem] border border-border/70 bg-card/70 p-8 shadow-[0_10px_40px_-28px_rgba(0,0,0,0.45)] sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
            Sobre a SoIZI
          </p>
          <h2 className={`${titleFont.className} mt-3 text-4xl leading-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl`}>
            Tecnologia e nutrição caminhando juntas
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            A SoIZI é uma plataforma focada em tornar a construção da informação nutricional mais clara e mais humana.
            O objetivo é oferecer uma experiência técnica, mas leve, para quem precisa entregar qualidade sem
            complicação.
          </p>
          <div className="mt-7 flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
            <span>RDC 429/2020 como referência operacional</span>
            <ArrowRight className="h-4 w-4" />
          </div>
        </section>

        <section id="plataforma" className="mt-18 scroll-mt-24 grid gap-8 md:grid-cols-3">
          {AUDIENCE.map((item) => (
            <article key={item.title} className="rounded-[1.8rem] border border-border/70 bg-card/80 p-6 shadow-[0_10px_40px_-28px_rgba(0,0,0,0.45)] backdrop-blur">
              <item.icon className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
              <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
            </article>
          ))}
        </section>

        <section id="dayane" className="mt-18 scroll-mt-24 overflow-hidden rounded-[2.3rem] border border-emerald-500/25 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent p-8 sm:p-10">
          <div className="relative mb-8 h-[240px] overflow-hidden rounded-[1.9rem] border border-border/70 sm:h-[280px]">
            <Image
              src={DAYANE_LINKEDIN_COVER_FALLBACK}
              alt="Capa de apresentação profissional da Dayane"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 1100px"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/72 via-black/56 to-black/24" />
            <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">Quem é a Dayane</p>
              <h3 className={`${titleFont.className} mt-2 text-2xl leading-tight text-white sm:text-4xl`}>
                {DAYANE_NAME}
              </h3>
              <p className="mt-2 max-w-3xl text-[11px] leading-relaxed text-zinc-100/90 sm:text-sm">
                {DAYANE_HEADLINE}
              </p>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div className="mx-auto w-full max-w-[260px]">
              <div className="relative aspect-square overflow-hidden rounded-[1.9rem] border border-border/70 bg-card">
                <Image
                  src="https://unavatar.io/linkedin/doutoraday"
                  alt="Foto de perfil pública do LinkedIn da Dayane"
                  fill
                  className="object-cover"
                  sizes="260px"
                />
              </div>
              <p className="mt-3 text-center text-xs text-muted-foreground">Curitiba e Região • 32.020 seguidores</p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
                Dayane
              </p>
              <h2 className={`${titleFont.className} mt-3 text-4xl leading-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl`}>
                A história por trás da SoIZI
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
                {DAYANE_NAME} é Engenheira de Alimentos, Doutora em Tecnologia de Alimentos e
                atua de forma estratégica em rotulagem, regulatório, segurança de alimentos e desenvolvimento de
                produtos. Ao longo da carreira, construiu uma trajetória sólida na indústria e hoje lidera a SoIZI
                com uma abordagem técnica, didática e prática.
              </p>

              <ul className="mt-5 space-y-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 sm:text-base">
                {DAYANE_HIGHLIGHTS.map((highlight) => (
                  <li key={highlight} className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-1 h-4 w-4 flex-none text-emerald-600 dark:text-emerald-300" />
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 rounded-[1.4rem] border border-border/70 bg-background/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
                  Linha do tempo
                </p>
                <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground sm:text-base">
                  {DAYANE_TRAJECTORY.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild size="lg" className="h-12 rounded-full px-7 text-base font-semibold">
                  <Link href="https://linkedin.com/in/doutoraday/" target="_blank" rel="noopener noreferrer">
                    Ver perfil da Dayane
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 rounded-full px-7 text-base font-semibold">
                  <Link href="#inicio">Voltar ao topo</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section id="acesso" className="mt-18 scroll-mt-24 rounded-[2.2rem] border border-border/70 bg-card/80 p-8 sm:p-10">
          <h2 className={`${titleFont.className} text-4xl leading-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl`}>
            Pronto para usar?
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Você pode entrar na sua conta para continuar de onde parou, ou criar uma nova conta e começar agora.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {isLoggedIn ? (
              <>
                <Button asChild size="lg" className="h-12 rounded-full px-7 text-base font-semibold">
                  <Link href="/dashboard">Continuar no painel</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 rounded-full px-7 text-base font-semibold">
                  <Link href="/dashboard/new">Criar nova tabela</Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild size="lg" className="h-12 rounded-full px-7 text-base font-semibold">
                  <Link href="/login">Login</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 rounded-full px-7 text-base font-semibold">
                  <Link href="/register">Criar conta</Link>
                </Button>
              </>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-border/70 bg-background/85">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
          <p>© {currentYear} SoIZI. Todos os direitos reservados.</p>
          <p className="font-medium">Construído por AsaTech</p>
        </div>
      </footer>
    </div>
  );
}
