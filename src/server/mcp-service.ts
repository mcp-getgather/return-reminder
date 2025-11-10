import {
  CallToolResultSchema,
  CompatibilityCallToolResultSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { RequestOptions } from '@modelcontextprotocol/sdk/shared/protocol.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { settings } from './config.js';
import locationService, { LocationData } from './location-service.js';
import { Logger } from './logger.js';

type MCPTool = {
  name: string;
  args?: (results: unknown[]) => Record<string, unknown>[];
};

const BRAND_MCP_TOOLS: Record<string, MCPTool[]> = {
  amazon: [{ name: 'amazon_dpage_get_purchase_history' }],
  amazonca: [{ name: 'amazonca_get_purchase_history' }],
  officedepot: [
    { name: 'officedepot_get_order_history' },
    {
      name: 'officedepot_get_order_history_details',
      args: (results) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const orders = (results[0] as any)?.purchase_history || [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return orders.map((order: any) => ({
          order_number: order.order_number,
        }));
      },
    },
  ],
  wayfair: [{ name: 'wayfair_dpage_get_order_history' }],
};

const MCP_URL_PATHS: Record<string, string> = {
  amazon: 'mcp-shopping',
  amazonca: 'mcp-shopping',
  wayfair: 'mcp-shopping',
};

export class MCPService {
  private static instance: MCPService | null = null;
  private client: Record<string, Client | null> = {};
  private initPromise: Promise<Client> | null = null;
  private serverUrl: string;
  private clientIpAddresses: Map<string, string> = new Map();

  private constructor() {
    this.serverUrl = settings.GETGATHER_URL || 'http://localhost:8000';
    this.clientIpAddresses = new Map();
  }

  static getInstance(): MCPService {
    if (!MCPService.instance) {
      MCPService.instance = new MCPService();
    }
    return MCPService.instance;
  }

  private async initializeClient(
    sessionId: string,
    brandId: string
  ): Promise<Client> {
    const mcpClientKey = `${sessionId}-${brandId}`;
    if (this.client[mcpClientKey]) return this.client[mcpClientKey];
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

      const mcpUrlPath = MCP_URL_PATHS[brandId] ?? 'mcp';
      const transport = new StreamableHTTPClientTransport(
        new URL(`${this.serverUrl}/${mcpUrlPath}/`),
        {
          requestInit: {
            headers: {
              'x-getgather-custom-app': 'return-reminder',
              'x-location': location ? JSON.stringify(location) : '',
              'x-incognito': '1',
            },
          },
        }
      );
      await client.connect(transport);

      this.client[mcpClientKey] = client;
      Logger.info('MCP client initialized successfully');
      return client;
    })();

    try {
      return await this.initPromise;
    } finally {
      this.initPromise = null;
    }
  }

  private async resetAndInitializeClient(
    sessionId: string,
    brandId: string
  ): Promise<Client> {
    const mcpClientKey = `${sessionId}-${brandId}`;
    try {
      if (this.client[mcpClientKey]) {
        await this.client[mcpClientKey].close().catch(() => {});
      }
    } finally {
      this.client[mcpClientKey] = null;
    }

    return this.initializeClient(sessionId, brandId);
  }

  private async callToolWithReconnect(
    params: {
      name: string;
      arguments?: Record<string, unknown>;
      sessionId: string;
      brandId: string;
    },
    resultSchema?:
      | typeof CallToolResultSchema
      | typeof CompatibilityCallToolResultSchema,
    options?: RequestOptions
  ) {
    const { sessionId, brandId } = params;
    try {
      const client = await this.getClient(sessionId, brandId);
      return await client.callTool(params, resultSchema, options);
    } catch (err) {
      Logger.warn('MCP call tool failed, reconnecting', {
        component: 'mcp-service',
        operation: 'callTool',
        toolName: params.name,
        sessionId: params.sessionId,
        error: err instanceof Error ? err.message : String(err),
      });
      await this.resetAndInitializeClient(params.sessionId, params.brandId);
      const client = await this.getClient(params.sessionId, params.brandId);
      return await client.callTool(params, resultSchema, options);
    }
  }

  async getClient(sessionId: string, brandId: string): Promise<Client> {
    const mcpClientKey = `${sessionId}-${brandId}`;
    if (!this.client[mcpClientKey]) {
      await this.initializeClient(sessionId, brandId);
    }
    if (!this.client[mcpClientKey]) {
      throw new Error('MCP client initialization failed');
    }
    return this.client[mcpClientKey];
  }

  getMCPTools(brandId: string): MCPTool[] {
    const tools = BRAND_MCP_TOOLS[brandId];
    if (!tools) {
      throw new Error(`No MCP tool configured for brand: ${brandId}`);
    }
    return tools;
  }

  async retrieveData(brandId: string, sessionId: string) {
    const tools = this.getMCPTools(brandId);
    const results: unknown[] = [];
    let mergedContent = {} as Record<string, unknown>;
    let currentToolName = '';

    try {
      for (let i = 0; i < tools.length; i++) {
        currentToolName = tools[i].name;
        Logger.debug('Calling MCP tool', {
          toolName: currentToolName,
          brandId,
          sessionId,
        });

        const toolArgs = tools[i].args?.(results) || [{}];

        // Call tool multiple times, once for each arg set
        const allResults = [];
        for (const argSet of toolArgs) {
          const result = await this.callToolWithReconnect({
            name: tools[i].name,
            arguments: argSet,
            sessionId: sessionId,
            brandId: brandId,
          });

          Logger.debug('MCP tool response received', {
            brandId,
            toolName: currentToolName,
            hasContent: !!result.structuredContent,
          });

          allResults.push(result.structuredContent);
        }

        const combinedResult = {} as Record<string, unknown>;
        for (const result of allResults) {
          const resultObj = result as Record<string, unknown>;
          for (const [key, value] of Object.entries(resultObj)) {
            if (Array.isArray(value)) {
              if (!combinedResult[key]) {
                combinedResult[key] = [];
              }
              (combinedResult[key] as unknown[]).push(...value);
            } else {
              combinedResult[key] = value;
            }
          }
        }

        results.push(combinedResult);
        mergedContent = {
          ...mergedContent,
          ...combinedResult,
        };
      }

      if (
        mergedContent.purchase_history &&
        mergedContent.purchase_history_details
      ) {
        mergedContent = this.wireOrderHistoryWithDetails(mergedContent);
      }

      return mergedContent as Record<string, string>;
    } catch (error) {
      Logger.error('MCP tool call failed', error as Error, {
        component: 'mcp-service',
        operation: 'retrieveData',
        brandId,
        toolName: currentToolName,
        sessionId,
      });
      throw error;
    }
  }

  async pollSignin(linkId: string, sessionId: string, brandId: string) {
    Logger.debug('Polling auth status', { linkId, sessionId });

    const result = await this.callToolWithReconnect(
      {
        name: 'poll_signin',
        arguments: { link_id: linkId },
        sessionId: sessionId,
        brandId: brandId,
      },
      undefined,
      {
        timeout: 6000000,
        maxTotalTimeout: 6000000,
      }
    );

    return result.structuredContent;
  }

  async getDpageUrl(brandId: string, sessionId: string) {
    const tools = this.getMCPTools(brandId);
    const result = await this.callToolWithReconnect({
      name: tools[0].name,
      sessionId: sessionId,
      brandId: brandId,
    });

    return result.structuredContent as Record<string, string>;
  }

  async checkDpageSignin(signinId: string, sessionId: string, brandId: string) {
    const result = await this.callToolWithReconnect(
      {
        name: 'check_signin',
        arguments: { signin_id: signinId },
        sessionId,
        brandId,
      },
      undefined,
      {
        timeout: 6000000,
        maxTotalTimeout: 6000000,
      }
    );

    const response = result.structuredContent as {
      status?: string;
      result?: unknown;
    };

    const isAuthCompleted = response?.status === 'SUCCESS';

    let purchases = null;

    if (typeof response.result === 'string') {
      purchases = JSON.parse(response.result);
    } else {
      purchases = response.result || [];
    }

    return {
      status: isAuthCompleted ? 'FINISHED' : 'PENDING',
      purchases,
    } as Record<string, unknown>;
  }

  async finalizeSignin({
    signinId,
    sessionId,
    brandId,
  }: {
    signinId: string;
    sessionId: string;
    brandId: string;
  }) {
    const result = await this.callToolWithReconnect(
      {
        name: 'finalize_signin',
        arguments: { signin_id: signinId },
        sessionId: sessionId,
        brandId: brandId,
      },
      undefined,
      {
        timeout: 6000000,
        maxTotalTimeout: 6000000,
      }
    );

    return result;
  }

  setClientIpAddress(sessionId: string, ipAddress: string) {
    this.clientIpAddresses.set(sessionId, ipAddress);
  }

  private wireOrderHistoryWithDetails(
    mergedContent: Record<string, unknown>
  ): Record<string, unknown> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const history = mergedContent.purchase_history as any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const details = mergedContent.purchase_history_details as any[];

    if (!Array.isArray(history) || !Array.isArray(details)) {
      return mergedContent;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const detailsByOrderId = new Map<string, any[]>();
    const orderIdKey = 'order_id' in details[0] ? 'order_id' : 'order_number';
    for (const detail of details) {
      if (detail[orderIdKey]) {
        if (!detailsByOrderId.has(detail[orderIdKey])) {
          detailsByOrderId.set(detail[orderIdKey], []);
        }
        detailsByOrderId.get(detail[orderIdKey])!.push(detail);
      }
    }

    const enrichedHistory = history.map((historyItem) => {
      const matchingDetails =
        detailsByOrderId.get(historyItem[orderIdKey]) || [];

      const enrichedItem = { ...historyItem };

      if (matchingDetails.length > 0) {
        const productNames = matchingDetails
          .map((detail) => detail.product_name)
          .filter((name) => name);
        enrichedItem.product_names = productNames;

        const imageUrls = matchingDetails
          .map((detail) => detail.image_url)
          .filter((url) => url);
        enrichedItem.image_urls = imageUrls;
      }

      return enrichedItem;
    });

    return {
      ...mergedContent,
      purchase_history: enrichedHistory,
    };
  }

  getServerUrl(): string {
    return this.serverUrl;
  }
}

export const mcpService = MCPService.getInstance();
