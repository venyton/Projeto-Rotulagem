import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
};

export function PageHeader({
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "app-enter flex min-w-0 flex-col gap-3 border-b pb-5 sm:gap-4 lg:flex-row lg:items-end lg:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="type-heading-medium break-words [overflow-wrap:anywhere]">{title}</h1>
        {description ? (
          <p className="type-body-small mt-2 max-w-3xl text-muted-foreground sm:text-base">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex w-full min-w-0 flex-wrap gap-2 sm:justify-end lg:w-auto lg:shrink-0">{actions}</div> : null}
    </header>
  );
}
