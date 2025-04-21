// TODO: DELETE ONCE ARCADE MCP HTTP STREAMABLE SETUP & WE CAN USE THAT AS THE DEFAULT

import { Tool } from "@/types/tool";

export const DUMMY_TOOLS: Tool[] = [
  {
    name: "github_repo_loader",
    description: "Load files from a GitHub repository.",
    inputSchema: {
      type: "object",
      properties: {
        repo_url: {
          type: "string",
          description: "URL of the GitHub repository",
        },
        branch: {
          type: "string",
          description: "Branch to load from (optional, defaults to main)",
        },
        file_path: {
          type: "string",
          description: "Specific file or directory path (optional)",
        },
      },
      required: ["repo_url"],
    },
  },
  {
    name: "arxiv_loader",
    description: "Search and load papers from ArXiv.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query for ArXiv papers" },
        max_results: {
          type: "integer",
          description:
            "Maximum number of papers to return (optional, default 10)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "gmail_reader",
    description: "Read emails from a Gmail account.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Search query for emails (e.g., 'from:user@example.com')",
        },
        max_emails: {
          type: "integer",
          description:
            "Maximum number of emails to fetch (optional, default 20)",
        },
        read_unread: {
          type: "string",
          enum: ["all", "read", "unread"],
          description: "Filter by read/unread status (optional, default 'all')",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "jira_issue_creator",
    description: "Create a new issue in Jira.",
    inputSchema: {
      type: "object",
      properties: {
        project_key: {
          type: "string",
          description: "Jira project key (e.g., 'PROJ')",
        },
        summary: { type: "string", description: "Issue title or summary" },
        description: {
          type: "string",
          description: "Detailed description of the issue (optional)",
        },
        issue_type: {
          type: "string",
          description: "Type of issue (e.g., 'Bug', 'Task', 'Story')",
        },
        assignee: {
          type: "string",
          description: "Jira username of the assignee (optional)",
        },
      },
      required: ["project_key", "summary", "issue_type"],
    },
  },
  {
    name: "linear_issue_creator",
    description: "Create a new issue in Linear.",
    inputSchema: {
      type: "object",
      properties: {
        team_id: { type: "string", description: "Linear team ID" },
        title: { type: "string", description: "Issue title" },
        description: {
          type: "string",
          description: "Detailed description (optional)",
        },
        priority: { type: "integer", description: "Priority level (optional)" },
        assignee_id: {
          type: "string",
          description: "User ID of the assignee (optional)",
        },
      },
      required: ["team_id", "title"],
    },
  },
  {
    name: "salesforce_contact_search",
    description: "Search for contacts in Salesforce.",
    inputSchema: {
      type: "object",
      properties: {
        search_term: {
          type: "string",
          description: "Name, email, or phone number to search for",
        },
        max_results: {
          type: "integer",
          description:
            "Maximum number of contacts to return (optional, default 10)",
        },
      },
      required: ["search_term"],
    },
  },
  {
    name: "hubspot_deal_creator",
    description: "Create a new deal in HubSpot.",
    inputSchema: {
      type: "object",
      properties: {
        deal_name: { type: "string", description: "Name of the deal" },
        amount: { type: "number", description: "Deal amount (optional)" },
        close_date: {
          type: "string",
          format: "date",
          description: "Expected close date (YYYY-MM-DD) (optional)",
        },
        pipeline: {
          type: "string",
          description: "Sales pipeline ID (optional)",
        },
        deal_stage: { type: "string", description: "Deal stage ID (optional)" },
        associated_contact_ids: {
          type: "array",
          items: { type: "string" },
          description: "List of associated contact IDs (optional)",
        },
      },
      required: ["deal_name"],
    },
  },
  {
    name: "web_search",
    description: "Perform a web search using a search engine.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "The search query" },
        num_results: {
          type: "integer",
          description: "Number of results to return (optional, default 5)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "file_system_reader",
    description: "Read content from a local file.",
    inputSchema: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "Absolute path to the local file",
        },
      },
      required: ["file_path"],
    },
  },
  {
    name: "code_interpreter",
    description: "Execute Python code in a sandboxed environment.",
    inputSchema: {
      type: "object",
      properties: {
        code: { type: "string", description: "Python code snippet to execute" },
      },
      required: ["code"],
    },
  },
  {
    name: "calendar_reader",
    description: "Read events from a calendar (e.g., Google Calendar).",
    inputSchema: {
      type: "object",
      properties: {
        start_date: {
          type: "string",
          format: "date-time",
          description: "Start date/time (ISO 8601 format)",
        },
        end_date: {
          type: "string",
          format: "date-time",
          description: "End date/time (ISO 8601 format)",
        },
        calendar_id: {
          type: "string",
          description: "Specific calendar ID (optional, default primary)",
        },
        max_events: {
          type: "integer",
          description:
            "Maximum number of events to return (optional, default 50)",
        },
      },
      required: ["start_date", "end_date"],
    },
  },
  {
    name: "slack_message_sender",
    description: "Send a message to a Slack channel or user.",
    inputSchema: {
      type: "object",
      properties: {
        channel_id: {
          type: "string",
          description: "Channel ID or User ID to send the message to",
        },
        message_text: {
          type: "string",
          description: "The content of the message",
        },
      },
      required: ["channel_id", "message_text"],
    },
  },
  {
    name: "database_query",
    description: "Execute a SQL query against a connected database.",
    inputSchema: {
      type: "object",
      properties: {
        sql_query: { type: "string", description: "The SQL query to execute" },
        database_connection_id: {
          type: "string",
          description: "Identifier for the database connection (optional)",
        },
      },
      required: ["sql_query"],
    },
  },
  {
    name: "api_request",
    description: "Make an HTTP request to an arbitrary API endpoint.",
    inputSchema: {
      type: "object",
      properties: {
        method: {
          type: "string",
          enum: ["GET", "POST", "PUT", "DELETE", "PATCH"],
          description: "HTTP method",
        },
        url: { type: "string", description: "URL of the API endpoint" },
        headers: {
          type: "object",
          description: "Request headers (key-value pairs) (optional)",
        },
        body: {
          type: "object",
          description:
            "Request body (JSON object) (optional for POST/PUT/PATCH)",
        },
      },
      required: ["method", "url"],
    },
  },
  {
    name: "pdf_reader",
    description: "Extract text content from a PDF file.",
    inputSchema: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "Path to the local PDF file",
        },
        url: { type: "string", description: "URL of the PDF file" },
      },
      // Requires either file_path or url
    },
  },
  {
    name: "vector_store_search",
    description: "Search for similar documents in a vector store.",
    inputSchema: {
      type: "object",
      properties: {
        query_text: {
          type: "string",
          description: "Text to find similar documents for",
        },
        collection_name: {
          type: "string",
          description: "Name of the vector store collection",
        },
        top_k: {
          type: "integer",
          description:
            "Number of similar documents to retrieve (optional, default 5)",
        },
      },
      required: ["query_text", "collection_name"],
    },
  },
  {
    name: "weather_lookup",
    description: "Get current weather conditions for a location.",
    inputSchema: {
      type: "object",
      properties: {
        location: { type: "string", description: "City name or zip code" },
        units: {
          type: "string",
          enum: ["metric", "imperial"],
          description: "Units for temperature (optional, default metric)",
        },
      },
      required: ["location"],
    },
  },
  {
    name: "code_linter",
    description: "Lint code files for style and errors.",
    inputSchema: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "Path to the code file or directory",
        },
        language: {
          type: "string",
          description:
            "Programming language (e.g., 'python', 'javascript') (optional)",
        },
        linter_config: {
          type: "string",
          description: "Path to linter configuration file (optional)",
        },
      },
      required: ["file_path"],
    },
  },
  {
    name: "documentation_generator",
    description:
      "Generate documentation from code comments (e.g., using Sphinx, JSDoc).",
    inputSchema: {
      type: "object",
      properties: {
        source_directory: {
          type: "string",
          description: "Directory containing the source code",
        },
        output_directory: {
          type: "string",
          description: "Directory to save the generated documentation",
        },
        config_file: {
          type: "string",
          description:
            "Path to the documentation tool's config file (optional)",
        },
      },
      required: ["source_directory", "output_directory"],
    },
  },
  {
    name: "human_handoff",
    description:
      "Pause execution and request input or assistance from a human.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "Question or instruction for the human",
        },
        context: {
          type: "object",
          description: "Relevant context or data for the human (optional)",
        },
      },
      required: ["prompt"],
    },
  },
];
