import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
  ctaOnClick?: () => void;
  variant?: "default" | "dashed";
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  ctaLabel,
  ctaHref,
  ctaOnClick,
  variant = "dashed",
}: EmptyStateProps) {
  return (
    <Card className={variant === "dashed" ? "border-dashed" : ""}>
      <CardContent className="p-12 text-center space-y-4">
        {Icon && (
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <Icon className="w-6 h-6 text-muted-foreground" />
          </div>
        )}
        <div>
          <div className="font-medium text-lg">{title}</div>
          {description && (
            <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">{description}</p>
          )}
        </div>
        {ctaLabel && (ctaHref || ctaOnClick) && (
          <div className="pt-2">
            {ctaHref ? (
              <Button asChild>
                <Link href={ctaHref}>{ctaLabel}</Link>
              </Button>
            ) : (
              <Button onClick={ctaOnClick}>{ctaLabel}</Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
