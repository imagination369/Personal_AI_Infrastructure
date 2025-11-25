/**
 * MCP Server: PAI UI Observer
 * Exposes UI state, DOM context, and visual information to PAI
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// UI State Schema
const UIStateSchema = z.object({
  currentView: z.string(),
  activeTab: z.enum(["contacts", "conversations", "pipelines"]),
  selectedItems: z.array(z.string()),
  filters: z.record(z.any()),
  formState: z.record(z.any()),
  breadcrumbs: z.array(z.string()),
});

// DOM Context Schema
const DOMContextSchema = z.object({
  focusedElement: z.string().optional(),
  visibleComponents: z.array(z.string()),
  scrollPosition: z.object({ x: z.number(), y: z.number() }),
  modalState: z.object({
    isOpen: z.boolean(),
    type: z.string().optional(),
  }),
});

/**
 * UI Observer MCP Server
 * PAI calls this to understand current UI state
 */
class UIObserverServer {
  private server: Server;
  private uiStateCache: Map<string, any> = new Map();

  constructor() {
    this.server = new Server(
      {
        name: "pai-ui-observer",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    this.setupTools();
    this.setupResources();
  }

  private setupTools() {
    // Tool: Get Current UI State
    this.server.setRequestHandler("tools/list", async () => ({
      tools: [
        {
          name: "get_ui_state",
          description: "Get current UI state including active tab, filters, selections",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "get_dom_context",
          description: "Get DOM context including visible elements, focus, scroll",
          inputSchema: {
            type: "object",
            properties: {
              includeAccessibilityTree: {
                type: "boolean",
                description: "Include accessibility tree for screen reader context",
              },
            },
          },
        },
        {
          name: "capture_screen_region",
          description: "Capture screenshot of specific UI region",
          inputSchema: {
            type: "object",
            properties: {
              selector: {
                type: "string",
                description: "CSS selector for region to capture",
              },
            },
            required: ["selector"],
          },
        },
        {
          name: "get_form_state",
          description: "Get current form values and validation state",
          inputSchema: {
            type: "object",
            properties: {
              formId: {
                type: "string",
                description: "Form identifier",
              },
            },
            required: ["formId"],
          },
        },
      ],
    }));

    this.server.setRequestHandler("tools/call", async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case "get_ui_state":
          return await this.getUIState();
        case "get_dom_context":
          return await this.getDOMContext(args);
        case "capture_screen_region":
          return await this.captureScreenRegion(args);
        case "get_form_state":
          return await this.getFormState(args);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  private setupResources() {
    // Resource: Live UI State Stream
    this.server.setRequestHandler("resources/list", async () => ({
      resources: [
        {
          uri: "pai://dashboard/ui-state",
          name: "Current UI State",
          description: "Live dashboard UI state",
          mimeType: "application/json",
        },
        {
          uri: "pai://dashboard/contacts/list",
          name: "Contacts List View",
          description: "Current contacts table data and filters",
          mimeType: "application/json",
        },
        {
          uri: "pai://dashboard/conversations/inbox",
          name: "Conversations Inbox",
          description: "Current conversation threads and messages",
          mimeType: "application/json",
        },
      ],
    }));

    this.server.setRequestHandler("resources/read", async (request) => {
      const { uri } = request.params;

      // Fetch from dashboard IPC or shared memory
      const state = await this.fetchUIStateFromDashboard(uri);
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(state, null, 2),
          },
        ],
      };
    });
  }

  private async getUIState() {
    // IPC call to dashboard renderer process
    const state = await this.fetchFromDashboard("ui-state");

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              timestamp: new Date().toISOString(),
              currentView: state.currentView,
              activeTab: state.activeTab,
              selectedItems: state.selectedItems,
              filters: state.filters,
              breadcrumbs: state.breadcrumbs,
              metadata: {
                totalContacts: state.metadata?.totalContacts || 0,
                unreadMessages: state.metadata?.unreadMessages || 0,
                activeFilters: Object.keys(state.filters || {}).length,
              },
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async getDOMContext(args: any) {
    const context = await this.fetchFromDashboard("dom-context");

    const result: any = {
      focusedElement: context.focusedElement,
      visibleComponents: context.visibleComponents,
      scrollPosition: context.scrollPosition,
      modalState: context.modalState,
      interactiveElements: context.interactiveElements, // buttons, inputs, links
    };

    if (args.includeAccessibilityTree) {
      result.accessibilityTree = await this.getAccessibilityTree();
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async captureScreenRegion(args: { selector: string }) {
    // Use Electron's capturePage or Puppeteer-like API
    const screenshot = await this.fetchFromDashboard("capture", args);

    return {
      content: [
        {
          type: "image",
          data: screenshot.base64,
          mimeType: "image/png",
        },
        {
          type: "text",
          text: `Screenshot captured for selector: ${args.selector}`,
        },
      ],
    };
  }

  private async getFormState(args: { formId: string }) {
    const formState = await this.fetchFromDashboard("form-state", args);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              formId: args.formId,
              values: formState.values,
              errors: formState.errors,
              touched: formState.touched,
              isDirty: formState.isDirty,
              isValid: formState.isValid,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async getAccessibilityTree() {
    // Get accessibility tree for semantic understanding
    const tree = await this.fetchFromDashboard("accessibility-tree");
    return tree;
  }

  private async fetchFromDashboard(action: string, args?: any) {
    // IPC communication with Electron renderer process
    // Or HTTP API call to local dashboard server
    // For now, return from cache
    return this.uiStateCache.get(action) || {};
  }

  private async fetchUIStateFromDashboard(uri: string) {
    // Implementation specific to dashboard architecture
    return {};
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("PAI UI Observer MCP Server running");
  }
}

// Start server
const server = new UIObserverServer();
server.start();
