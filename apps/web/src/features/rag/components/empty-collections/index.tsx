import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FolderPlus, Layers } from "lucide-react";

export default function EmptyCollectionsState() {
  return (
    <Card className="bg-muted/20 border-2 border-dashed">
      <CardContent className="flex flex-col items-center justify-center space-y-6 px-6 py-12 text-center">
        <div className="bg-primary/10 rounded-full p-4">
          <Layers className="text-primary h-12 w-12" />
        </div>

        <div className="max-w-md space-y-2">
          <h3 className="text-xl font-semibold tracking-tight">
            No collections yet
          </h3>
          <p className="text-muted-foreground">
            Collections help you organize your documents and resources in one
            place. Create your first collection to get started.
          </p>
        </div>

        <Button
          size="lg"
          className="mt-4 gap-2"
        >
          <FolderPlus className="h-4 w-4" />
          Create your first collection
        </Button>
      </CardContent>
    </Card>
  );
}
