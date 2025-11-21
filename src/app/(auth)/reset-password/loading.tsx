import { Skeleton } from "@/components/ui/skeleton";

export default function ResetPasswordLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center py-10">
      {/* Card skeleton with matching structure */}
      <div className="w-full max-w-md">
        <Skeleton className="w-full p-6" data-radius="radius2">
          {/* Card Header */}
          <div className="mb-6 space-y-3">
            <Skeleton className="h-8 w-48 mx-auto" data-radius="radius2" />
            <Skeleton className="h-4 w-64 mx-auto" data-radius="radius2" />
          </div>

          {/* Form fields */}
          <div className="space-y-4">
            {/* New password field */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" data-radius="radius2" />
              <Skeleton className="h-11 w-full" data-radius="radius2" />
            </div>

            {/* Confirm password field */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-36" data-radius="radius2" />
              <Skeleton className="h-11 w-full" data-radius="radius2" />
            </div>

            {/* Submit button */}
            <Skeleton className="h-10 w-full" data-radius="radius2" />
          </div>
        </Skeleton>
      </div>
    </div>
  );
}
