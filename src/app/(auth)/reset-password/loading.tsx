import { Skeleton } from "@/components/ui/skeleton";

export default function ResetPasswordLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center py-10">
      {/* Card skeleton with matching structure */}
      <div className="w-full max-w-md">
        <Skeleton
          className="w-full p-6"
          data-radius="surface"
        >
          {/* Card Header */}
          <div className="mb-6 space-y-3">
            <Skeleton
              className="mx-auto h-8 w-48"
              data-radius="surface"
            />
            <Skeleton
              className="mx-auto h-4 w-64"
              data-radius="surface"
            />
          </div>

          {/* Form fields */}
          <div className="space-y-4">
            {/* New password field */}
            <div className="space-y-2">
              <Skeleton
                className="h-4 w-32"
                data-radius="surface"
              />
              <Skeleton
                className="h-11 w-full"
                data-radius="surface"
              />
            </div>

            {/* Confirm password field */}
            <div className="space-y-2">
              <Skeleton
                className="h-4 w-36"
                data-radius="surface"
              />
              <Skeleton
                className="h-11 w-full"
                data-radius="surface"
              />
            </div>

            {/* Submit button */}
            <Skeleton
              className="h-10 w-full"
              data-radius="surface"
            />
          </div>
        </Skeleton>
      </div>
    </div>
  );
}
