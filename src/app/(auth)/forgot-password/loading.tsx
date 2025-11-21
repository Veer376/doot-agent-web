import { Skeleton } from "@/components/ui/skeleton";

export default function ForgotPasswordLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Header skeleton */}
        <div className="mb-4 flex items-center flex-col gap-3 sm:gap-4 justify-center">
          <Skeleton className="h-8 w-56" data-radius="radius2" />
          <Skeleton className="h-4 w-72" data-radius="radius2" />
        </div>

        {/* Form skeleton */}
        <div className="space-y-3">
          {/* Email input */}
          <Skeleton className="h-11 w-full" data-radius="radius2" />
          
          {/* Submit button */}
          <div className="pt-2">
            <Skeleton className="h-10 w-full" data-radius="radius2" />
          </div>
        </div>

        {/* Footer link skeleton */}
        <div className="mt-6 flex justify-center">
          <Skeleton className="h-5 w-40" data-radius="radius2" />
        </div>
      </div>
    </div>
  );
}
