export interface Tool {
  /**
   * The tool's ID. This is a unique v4 UUID.
   */
  id: string;
  /**
   * The name of the tool.
   */
  name: string;
  /**
   * A description of the tool.
   */
  description: string;
  /**
   * The URL of the tool server.
   */
  url: string;
  /**
   * The JSON schema of the tool.
   */
  schema: string;
}
