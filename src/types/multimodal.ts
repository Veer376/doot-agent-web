/**
 * Type for base64-encoded content blocks (images and files)
 * Used for multimodal message content
 */
export interface Base64ContentBlock {
  type: "image" | "file";
  source_type: "base64";
  mime_type: string;
  data: string;
  metadata?: {
    name?: string;
    filename?: string;
  };
}
