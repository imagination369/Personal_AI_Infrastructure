/**
 * MCP Server: PAI UI Controller
 * Allows PAI to dispatch actions and control UI
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Action Types
type UIAction =
  | { type: "NAVIGATE"; payload: { tab: string; path?: string } }
  | { type: "SELECT_ITEM"; payload: { itemId: string; multi?: boolean } }
  | { type: "OPEN_MODAL"; payload: { modalType: string; data?: any } }
  | { type: "CLOSE_MODAL" }
  | { type: "FILL_FORM"; payload: { formId: string; values: Record<string, any> } }
  | { type: "SUBMIT_FORM"; payload: { formId: string } }
  | { type: "APPLY_FILTER"; payload: { filterKey: string; value: any } }
  | { type: "CLEAR_FILTERS" }
  | { type: "SORT_TABLE"; payload: { column: string; direction: "asc" | "desc" } }
  | { type: "SEARCH"; payload: { query: string } }
  | { type: "CREATE_CONTACT"; payload: { data: any } }
  | { type: "UPDATE_CONTACT"; payload: { id: string; data: any } }
  | { type: "DELETE_CONTACT"; payload: { id: string } }
  | { type: "SEND_MESSAGE"; payload: { conversationId: string; message: string } }
  | { type: "EXECUTE_BULK_ACTION"; payload: { action: string; itemIds: string[] } };

/**
 * UI Controller MCP Server
 * PAI calls this to perform actions on the dashboard
 */
class UIControllerServer {
  private server: Server;
  private actionQueue: UIAction[] = [];

  constructor() {
    this.server = new Server(
      {
        name: "pai-ui-controller",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupTools();
  }

  private setupTools() {
    this.server.setRequestHandler("tools/list", async () => ({
      tools: [
        // Navigation
        {
          name: "navigate_to_tab",
          description: "Navigate to a specific tab (contacts, conversations, pipelines)",
          inputSchema: {
            type: "object",
            properties: {
              tab: {
                type: "string",
                enum: ["contacts", "conversations", "pipelines"],
              },
              path: {
                type: "string",
                description: "Optional sub-path within tab",
              },
            },
            required: ["tab"],
          },
        },

        // Selection & Focus
        {
          name: "select_items",
          description: "Select one or more items in the current view",
          inputSchema: {
            type: "object",
            properties: {
              itemIds: {
                type: "array",
                items: { type: "string" },
              },
              clearPrevious: {
                type: "boolean",
                default: true,
              },
            },
            required: ["itemIds"],
          },
        },

        // Modal Management
        {
          name: "open_modal",
          description: "Open a modal dialog (create contact, edit, etc)",
          inputSchema: {
            type: "object",
            properties: {
              modalType: {
                type: "string",
                enum: ["create-contact", "edit-contact", "contact-details", "send-message"],
              },
              data: {
                type: "object",
                description: "Modal context data",
              },
            },
            required: ["modalType"],
          },
        },
        {
          name: "close_modal",
          description: "Close the currently open modal",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },

        // Form Operations
        {
          name: "fill_form",
          description: "Fill form fields with values",
          inputSchema: {
            type: "object",
            properties: {
              formId: {
                type: "string",
              },
              values: {
                type: "object",
                description: "Field name to value mapping",
              },
            },
            required: ["formId", "values"],
          },
        },
        {
          name: "submit_form",
          description: "Submit a form",
          inputSchema: {
            type: "object",
            properties: {
              formId: {
                type: "string",
              },
            },
            required: ["formId"],
          },
        },

        // Filtering & Search
        {
          name: "apply_filter",
          description: "Apply filter to current view",
          inputSchema: {
            type: "object",
            properties: {
              filterKey: {
                type: "string",
                description: "Filter field (status, tags, dateRange, etc)",
              },
              value: {
                description: "Filter value",
              },
            },
            required: ["filterKey", "value"],
          },
        },
        {
          name: "search",
          description: "Search in current view",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
              },
            },
            required: ["query"],
          },
        },

        // CRUD Operations
        {
          name: "create_contact",
          description: "Create a new contact",
          inputSchema: {
            type: "object",
            properties: {
              firstName: { type: "string" },
              lastName: { type: "string" },
              email: { type: "string" },
              phone: { type: "string" },
              tags: { type: "array", items: { type: "string" } },
              customFields: { type: "object" },
            },
            required: ["firstName", "email"],
          },
        },
        {
          name: "update_contact",
          description: "Update existing contact",
          inputSchema: {
            type: "object",
            properties: {
              id: { type: "string" },
              updates: { type: "object" },
            },
            required: ["id", "updates"],
          },
        },
        {
          name: "delete_contact",
          description: "Delete a contact",
          inputSchema: {
            type: "object",
            properties: {
              id: { type: "string" },
              confirm: { type: "boolean", default: true },
            },
            required: ["id"],
          },
        },

        // Messaging
        {
          name: "send_message",
          description: "Send message in conversation",
          inputSchema: {
            type: "object",
            properties: {
              conversationId: { type: "string" },
              message: { type: "string" },
              attachments: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: ["conversationId", "message"],
          },
        },

        // Bulk Operations
        {
          name: "execute_bulk_action",
          description: "Execute action on multiple items",
          inputSchema: {
            type: "object",
            properties: {
              action: {
                type: "string",
                enum: ["delete", "tag", "export", "assign"],
              },
              itemIds: {
                type: "array",
                items: { type: "string" },
              },
              actionData: {
                type: "object",
              },
            },
            required: ["action", "itemIds"],
          },
        },
      ],
    }));

    this.server.setRequestHandler("tools/call", async (request) => {
      const { name, arguments: args } = request.params;

      try {
        const result = await this.executeAction(name, args);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: false,
                  error: error.message,
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async executeAction(actionName: string, args: any) {
    // Dispatch action to dashboard
    const action = this.mapToolToAction(actionName, args);
    const result = await this.dispatchToDashboard(action);

    return {
      success: true,
      action: actionName,
      timestamp: new Date().toISOString(),
      result,
    };
  }

  private mapToolToAction(toolName: string, args: any): UIAction {
    switch (toolName) {
      case "navigate_to_tab":
        return { type: "NAVIGATE", payload: args };
      case "select_items":
        return {
          type: "SELECT_ITEM",
          payload: { itemId: args.itemIds[0], multi: args.itemIds.length > 1 },
        };
      case "open_modal":
        return { type: "OPEN_MODAL", payload: args };
      case "close_modal":
        return { type: "CLOSE_MODAL" };
      case "fill_form":
        return { type: "FILL_FORM", payload: args };
      case "submit_form":
        return { type: "SUBMIT_FORM", payload: args };
      case "apply_filter":
        return { type: "APPLY_FILTER", payload: args };
      case "search":
        return { type: "SEARCH", payload: args };
      case "create_contact":
        return { type: "CREATE_CONTACT", payload: { data: args } };
      case "update_contact":
        return { type: "UPDATE_CONTACT", payload: args };
      case "delete_contact":
        return { type: "DELETE_CONTACT", payload: args };
      case "send_message":
        return { type: "SEND_MESSAGE", payload: args };
      case "execute_bulk_action":
        return { type: "EXECUTE_BULK_ACTION", payload: args };
      default:
        throw new Error(`Unknown action: ${toolName}`);
    }
  }

  private async dispatchToDashboard(action: UIAction) {
    // Send action to dashboard via IPC or WebSocket
    // Dashboard reducer handles the action and updates state
    console.error(`Dispatching action: ${action.type}`);

    // Simulate IPC call
    // In real implementation: ipcRenderer.invoke('dispatch-action', action)
    // Or: websocket.send(JSON.stringify({ type: 'ACTION', action }))

    return { dispatched: true, action };
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("PAI UI Controller MCP Server running");
  }
}

// Start server
const server = new UIControllerServer();
server.start();
