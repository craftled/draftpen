import { motion } from "framer-motion";
import {
  Code,
  Copy,
  Database,
  ExternalLink,
  Network,
  Server,
} from "lucide-react";
import type React from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MCPServer {
  qualifiedName: string;
  displayName: string;
  description?: string;
  homepage?: string;
  useCount?: string;
  isDeployed?: boolean;
  deploymentUrl?: string;
  connections?: Array<{
    type: string;
    url?: string;
    configSchema?: any;
  }>;
  createdAt?: string;
}

interface MCPServerListProps {
  servers: MCPServer[];
  query: string;
  pagination?: {
    currentPage: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
  };
  isLoading?: boolean;
  error?: string;
}

export const MCPServerList: React.FC<MCPServerListProps> = ({
  servers,
  query,
  isLoading,
  error,
}) => {
  if (isLoading) {
    return (
      <div className="scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-700 flex space-x-3 overflow-x-auto pb-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            className="h-28 w-80 shrink-0 animate-pulse rounded-md bg-neutral-100 dark:bg-neutral-800"
            key={i}
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 rounded-md border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
        <Server className="h-5 w-5 text-red-500 dark:text-red-400" />
        <p className="text-red-600 text-sm dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (!servers || servers.length === 0) {
    return (
      <div className="flex items-center justify-center px-4 py-8 text-center">
        <div className="mr-4 flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
          <Server className="h-5 w-5 text-neutral-400" />
        </div>
        <div>
          <h3 className="font-medium text-base text-neutral-900 dark:text-neutral-100">
            No Servers Found
          </h3>
          <p className="mt-1 text-neutral-500 text-sm dark:text-neutral-400">
            No MCP servers matching &quot;{query}&quot; were found.
          </p>
        </div>
      </div>
    );
  }

  // Connection type icons
  const connectionIcons: Record<string, React.ReactNode> = {
    ws: <Network className="h-3.5 w-3.5" />,
    stdio: <Code className="h-3.5 w-3.5" />,
    default: <Database className="h-3.5 w-3.5" />,
  };

  return (
    <div className="space-y-3">
      <div className="px-1">
        <p className="text-neutral-500 text-xs dark:text-neutral-400">
          {servers.length} server{servers.length !== 1 ? "s" : ""} found
        </p>
      </div>

      <div className="scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-700 flex gap-3 overflow-x-auto pb-3">
        {servers.map((server, idx) => {
          return (
            <motion.div
              animate={{ opacity: 1, x: 0 }}
              className="w-80 shrink-0 rounded-lg border border-neutral-200 bg-white dark:border-neutral-800/60 dark:bg-neutral-900/40"
              initial={{ opacity: 0, x: 10 }}
              key={server.qualifiedName}
              transition={{ duration: 0.2, delay: idx * 0.05 }}
            >
              <div className="p-3.5">
                <div className="mb-2.5 flex items-start space-x-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-neutral-100 dark:bg-neutral-800">
                    <Server className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <h3 className="truncate font-medium text-neutral-900 text-sm leading-tight dark:text-white">
                        {server.displayName || server.qualifiedName}
                      </h3>

                      <div className="flex shrink-0 items-center gap-0.5">
                        {server.homepage && (
                          <Button
                            className="h-6 w-6 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                            onClick={() =>
                              window.open(server.homepage, "_blank")
                            }
                            size="icon"
                            variant="ghost"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        )}

                        <Button
                          className="h-6 w-6 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                          onClick={() => {
                            navigator.clipboard.writeText(server.qualifiedName);
                            toast.success("Server ID copied!");
                          }}
                          size="icon"
                          variant="ghost"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    <p className="mt-0.5 truncate text-neutral-500 text-xs">
                      {server.qualifiedName}
                    </p>
                  </div>
                </div>

                {server.description && (
                  <p className="mb-2.5 line-clamp-2 text-neutral-600 text-xs dark:text-neutral-400">
                    {server.description}
                  </p>
                )}

                {/* Connection badges */}
                <div className="flex flex-wrap gap-1.5">
                  {server.connections?.map((conn, idx) => (
                    <TooltipProvider key={`${conn.type}-${idx}`}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge
                            className="flex cursor-pointer items-center gap-1 border-0 bg-neutral-100 px-2 py-0.5 text-neutral-700 text-xs transition-colors duration-150 hover:bg-neutral-200 hover:text-neutral-900 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700! dark:hover:text-white"
                            onClick={() => {
                              if (conn.url) {
                                navigator.clipboard.writeText(conn.url);
                                toast.success(`${conn.type} URL copied!`);
                              }
                            }}
                          >
                            {connectionIcons[conn.type] ||
                              connectionIcons.default}
                            {conn.type}
                          </Badge>
                        </TooltipTrigger>
                        {conn.url && (
                          <TooltipContent className="max-w-xs">
                            <code className="break-all font-mono text-xs">
                              {conn.url}
                            </code>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  ))}

                  {server.deploymentUrl && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge
                            className="flex cursor-pointer items-center gap-1 border-0 bg-emerald-50 px-2 py-0.5 text-emerald-700 text-xs transition-colors duration-150 hover:bg-emerald-100 hover:text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 dark:hover:bg-emerald-800/60 dark:hover:text-emerald-200"
                            onClick={() => {
                              navigator.clipboard.writeText(
                                server.deploymentUrl!
                              );
                              toast.success("Deployment URL copied!");
                            }}
                          >
                            <Server className="h-3.5 w-3.5" />
                            deployed
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <code className="break-all font-mono text-xs">
                            {server.deploymentUrl}
                          </code>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>

                {server.useCount && Number.parseInt(server.useCount) > 0 && (
                  <div className="mt-2.5 flex justify-between text-[10px] text-neutral-500">
                    <span>Usage: {server.useCount}</span>
                    {server.createdAt && (
                      <span>
                        Added: {new Date(server.createdAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default MCPServerList;
