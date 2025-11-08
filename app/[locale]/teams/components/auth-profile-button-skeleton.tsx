import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"

export function AuthProfileButtonSkeleton() {
  return (
    <div className="relative inline-block">
      <Avatar className="h-8 w-8">
        <AvatarFallback className="bg-secondary">
          <Skeleton className="h-full w-full rounded-full" />
        </AvatarFallback>
      </Avatar>
    </div>
  )
}
