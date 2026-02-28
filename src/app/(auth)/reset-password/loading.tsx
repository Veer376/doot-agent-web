import { Skeleton } from "@/components/ui/skeleton";

export default function ResetPasswordLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center py-10">
      {/* Card skeleton with matching structure */}
      <div className="w-full max-w-md">
        <Skeleton
          className="w-full p-6"
          data-radius="radius"
        >
          {/* Card Header */}
          <div className="mb-6 space-y-3">
            <Skeleton
              className="mx-auto h-8 w-48"
              data-radius="radius"
            />
            <Skeleton
              className="mx-auto h-4 w-64"
              data-radius="radius"
            />
          </div>

          {/* Form fields */}
          <div className="space-y-4">
            {/* New password field */}
            <div className="space-y-2">
              <Skeleton
                className="h-4 w-32"
                data-radius="radius"
              />
              <Skeleton
                className="h-11 w-full"
                data-radius="radius"
              />
            </div>

            {/* Confirm password field */}
            <div className="space-y-2">
              <Skeleton
                className="h-4 w-36"
                data-radius="radius"
              />
              <Skeleton
                className="h-11 w-full"
                data-radius="radius"
              />
            </div>

            {/* Submit button */}
            <Skeleton
              className="h-10 w-full"
              data-radius="radius"
            />
          </div>
        </Skeleton>
      </div>
    </div>
  );
}
