import { Skeleton } from "@/components/ui/skeleton";

export default function SignUpLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Header skeleton */}
        <div className="mb-10 flex items-center flex-col gap-3 sm:gap-4 justify-center">
          <Skeleton className="h-8 w-64" data-radius="radius2" />
        </div>

        {/* Form skeleton */}
        <div className="space-y-3">
          {/* First name and Last name - two column grid */}
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-11 w-full" data-radius="radius2" />
            <Skeleton className="h-11 w-full" data-radius="radius2" />
          </div>
          
          {/* Email input */}
          <Skeleton className="h-11 w-full" data-radius="radius2" />
          
          {/* Password input */}
          <Skeleton className="h-11 w-full" data-radius="radius2" />
          
          {/* Confirm password input */}
          <Skeleton className="h-11 w-full" data-radius="radius2" />
          
          {/* Submit button */}
          <div className="pt-2">
            <Skeleton className="h-10 w-full" data-radius="radius2" />
          </div>
        </div>

        {/* Divider */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center">
            <Skeleton className="h-5 w-8 bg-background" data-radius="radius2" />
          </div>
        </div>

        {/* OAuth button skeleton */}
        <Skeleton className="h-12 w-full" data-radius="radius2" />

        {/* Footer text skeleton */}
        <div className="mt-6 flex justify-center gap-1">
          <Skeleton className="h-5 w-32" data-radius="radius2" />
          <Skeleton className="h-5 w-16" data-radius="radius2" />
        </div>
      </div>
    </div>
  );
}
