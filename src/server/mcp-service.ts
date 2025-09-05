import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { settings } from './config.js';

const BRAND_MCP_TOOLS: Record<string, string> = {
  amazon: 'amazon_get_purchase_history',
  amazonca: 'amazonca_get_purchase_history',
  officedepot: 'officedepot_get_order_history',
  wayfair: 'wayfair_get_order_history',
};

export class MCPService {
  private static instance: MCPService | null = null;
  private client: Client | null = null;
  private initPromise: Promise<Client> | null = null;
  private serverUrl: string;
  private mcpUrl: string;

  private constructor() {
    this.serverUrl = settings.GETGATHER_URL || 'http://localhost:8000';
    this.mcpUrl = `${this.serverUrl}/mcp/`;
  }

  static getInstance(): MCPService {
    if (!MCPService.instance) {
      MCPService.instance = new MCPService();
    }
    return MCPService.instance;
  }

  private async initializeClient(): Promise<Client> {
    if (this.client) return this.client;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      const client = new Client(
        { name: 'return-reminder-server', version: '1.0.0' },
        { capabilities: {} }
      );

      const transport = new StreamableHTTPClientTransport(new URL(this.mcpUrl));
      await client.connect(transport);

      this.client = client;
      console.log('MCP client initialized successfully');
      return client;
    })();

    try {
      return await this.initPromise;
    } finally {
      this.initPromise = null;
    }
  }

  async getClient(): Promise<Client> {
    if (!this.client) {
      await this.initializeClient();
    }
    if (!this.client) {
      throw new Error('MCP client initialization failed');
    }
    return this.client;
  }

  getMCPToolName(brandId: string): string {
    const toolName = BRAND_MCP_TOOLS[brandId];
    if (!toolName) {
      throw new Error(`No MCP tool configured for brand: ${brandId}`);
    }
    return toolName;
  }

  async retrieveData(brandId: string) {
    const client = await this.getClient();
    const toolName = this.getMCPToolName(brandId);

    console.log(`Calling MCP tool: ${toolName} for brand: ${brandId}`);

    try {
      const result = await client.callTool({
        name: toolName,
        arguments: {},
      });

      console.log(
        `MCP tool response for ${brandId}:`,
        JSON.stringify(result.structuredContent, null, 2)
      );
      return result.structuredContent;
    } catch (error) {
      console.error(`Error calling MCP tool ${toolName}:`, error);
      throw error;
    }
  }

  async pollAuth(linkId: string) {
    const client = await this.getClient();

    console.log(`Polling auth status for link_id: ${linkId}`);

    const result = await client.callTool(
      {
        name: 'poll_auth',
        arguments: { link_id: linkId },
      },
      undefined,
      {
        timeout: 6000000,
        maxTotalTimeout: 6000000,
      }
    );

    return result.structuredContent;
  }

  getServerUrl(): string {
    return this.serverUrl;
  }
}

export const mcpService = MCPService.getInstance();
