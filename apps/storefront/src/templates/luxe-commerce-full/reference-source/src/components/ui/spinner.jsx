import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

function Spinner({
  className,
  ...props
}) {
  return (
    <Skeleton
      role="status"
      aria-label="جاري التحميل"
      className={cn("size-4 rounded-full", className)}
      {...props} />
  );
}

export { Spinner }
