import type { McpTool } from "@/server/mcp/registry";
import { pmAccount } from "@/server/mcp/tools/account";
import { pmAccounts } from "@/server/mcp/tools/accounts";
import { pmAnalytics } from "@/server/mcp/tools/analytics";
import { pmAutomation } from "@/server/mcp/tools/automation";
import { pmCalendar } from "@/server/mcp/tools/calendar";
import { pmCarousels } from "@/server/mcp/tools/carousels";
import { pmContentTypes } from "@/server/mcp/tools/content-types";
import { pmDevices } from "@/server/mcp/tools/devices";
import { pmInventory } from "@/server/mcp/tools/inventory";
import { pmOverview } from "@/server/mcp/tools/overview";
import { pmReports } from "@/server/mcp/tools/reports";
import { pmResources } from "@/server/mcp/tools/resources";
import { pmSessions } from "@/server/mcp/tools/sessions";
import { pmStories } from "@/server/mcp/tools/stories";
import { pmTodo } from "@/server/mcp/tools/todo";
import { pmTrends } from "@/server/mcp/tools/trends";
import { pmWarmups } from "@/server/mcp/tools/warmups";

/** Every tool the server offers, in the order Claude sees them. All read-only. */
export const TOOLS: McpTool[] = [
  pmOverview,
  pmAccounts,
  pmAccount,
  pmCalendar,
  pmInventory,
  pmContentTypes,
  pmAnalytics,
  pmReports,
  pmAutomation,
  pmTodo,
  pmDevices,
  pmWarmups,
  pmSessions,
  pmCarousels,
  pmTrends,
  pmStories,
  pmResources,
];
