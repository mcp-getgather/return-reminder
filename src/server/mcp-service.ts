import {
  CallToolResultSchema,
  CompatibilityCallToolResultSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { RequestOptions } from '@modelcontextprotocol/sdk/shared/protocol.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { settings } from './config.js';
import locationService, { LocationData } from './location-service.js';

const BRAND_MCP_TOOLS: Record<string, string> = {
  amazon: 'amazon_get_purchase_history',
  amazonca: 'amazonca_get_purchase_history',
  officedepot: 'officedepot_get_order_history',
  wayfair: 'wayfair_get_order_history',
};

export class MCPService {
  private static instance: MCPService | null = null;
  private client: Record<string, Client | null> = {};
  private initPromise: Promise<Client> | null = null;
  private serverUrl: string;
  private mcpUrl: string;
  private clientIpAddresses: Map<string, string> = new Map();

  private constructor() {
    this.serverUrl = settings.GETGATHER_URL || 'http://localhost:8000';
    this.mcpUrl = `${this.serverUrl}/mcp/`;
    this.clientIpAddresses = new Map();
  }

  static getInstance(): MCPService {
    if (!MCPService.instance) {
      MCPService.instance = new MCPService();
    }
    return MCPService.instance;
  }

  private async initializeClient(sessionId: string): Promise<Client> {
    if (this.client[sessionId]) return this.client[sessionId];
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      const client = new Client(
        { name: 'return-reminder-server', version: '1.0.0' },
        { capabilities: {} }
      );

      const ipAddress = this.clientIpAddresses.get(sessionId);
      let location: LocationData | null = null;
      if (ipAddress) {
        location = await locationService.getLocationForProxy(ipAddress);
      }

      console.log('Setup MCP client with location: ', location);
      const transport = new StreamableHTTPClientTransport(
        new URL(this.mcpUrl),
        {
          requestInit: {
            headers: {
              'x-getgather-custom-app': 'return-reminder',
              'x-location': location ? JSON.stringify(location) : '',
            },
          },
        }
      );
      await client.connect(transport);

      this.client[sessionId] = client;
      console.log('MCP client initialized successfully');
      return client;
    })();

    try {
      return await this.initPromise;
    } finally {
      this.initPromise = null;
    }
  }

  private async resetAndInitializeClient(sessionId: string): Promise<Client> {
    try {
      if (this.client[sessionId]) {
        await this.client[sessionId].close().catch(() => {});
      }
    } finally {
      this.client[sessionId] = null;
    }

    return this.initializeClient(sessionId);
  }

  private async callToolWithReconnect(
    params: {
      name: string;
      arguments?: Record<string, unknown>;
      sessionId: string;
    },
    resultSchema?:
      | typeof CallToolResultSchema
      | typeof CompatibilityCallToolResultSchema,
    options?: RequestOptions
  ) {
    try {
      const client = await this.getClient(params.sessionId);
      return await client.callTool(params, resultSchema, options);
    } catch (err) {
      console.warn('callTool failed, reconnecting with MCP Client...', err);
      await this.resetAndInitializeClient(params.sessionId);
      const client = await this.getClient(params.sessionId);
      return await client.callTool(params, resultSchema, options);
    }
  }

  async getClient(sessionId: string): Promise<Client> {
    if (!this.client[sessionId]) {
      await this.initializeClient(sessionId);
    }
    if (!this.client[sessionId]) {
      throw new Error('MCP client initialization failed');
    }
    return this.client[sessionId];
  }

  getMCPToolName(brandId: string): string {
    const toolName = BRAND_MCP_TOOLS[brandId];
    if (!toolName) {
      throw new Error(`No MCP tool configured for brand: ${brandId}`);
    }
    return toolName;
  }

  async retrieveData(brandId: string, sessionId: string) {
    const toolName = this.getMCPToolName(brandId);

    console.log(`Calling MCP tool: ${toolName} for brand: ${brandId}`);

    try {
      const result = await this.callToolWithReconnect({
        name: toolName,
        arguments: {},
        sessionId: sessionId,
      });

      console.log(
        `MCP tool response for ${brandId}:`,
        JSON.stringify(result.structuredContent, null, 2)
      );
      return result.structuredContent as Record<string, string>;
    } catch (error) {
      console.error(`Error calling MCP tool ${toolName}:`, error);
      throw error;
    }
  }

  async pollSignin(linkId: string, sessionId: string) {
    console.log(`Polling auth status for link_id: ${linkId}`);

    const result = await this.callToolWithReconnect(
      {
        name: 'poll_signin',
        arguments: { link_id: linkId },
        sessionId: sessionId,
      },
      undefined,
      {
        timeout: 6000000,
        maxTotalTimeout: 6000000,
      }
    );

    return result.structuredContent;
  }

  setClientIpAddress(sessionId: string, ipAddress: string) {
    this.clientIpAddresses.set(sessionId, ipAddress);
  }

  getServerUrl(): string {
    return this.serverUrl;
  }
}

export const mcpService = MCPService.getInstance();
