"use client";

import type { CardProps } from "@heroui/react";

import React from "react";
import { Card, CardBody, CardHeader, Chip, cn } from "@heroui/react";
import { Icon } from "@iconify/react";
import type { AgentStatus } from "@/lib/agent-api";

type AgentSlot = {
  label: string;
  name: string;
  status: AgentStatus;
};

export type AgentStatusPanelProps = CardProps & {
  agents: AgentSlot[];
};

const statusMeta: Record<string, { color: "success" | "warning" | "danger" | "default" | "primary" | "secondary"; icon: string; label: string }> = {
  online: { color: "success", icon: "solar:check-circle-bold", label: "Online" },
  ready: { color: "success", icon: "solar:check-circle-bold", label: "Ready" },
  idle: { color: "default", icon: "solar:pause-circle-bold", label: "Idle" },
  speaking: { color: "secondary", icon: "solar:chat-round-dots-bold", label: "Speaking" },
  thinking: { color: "warning", icon: "solar:cpu-bolt-bold", label: "Thinking" },
  degraded: { color: "warning", icon: "solar:danger-triangle-bold", label: "Degraded" },
  restarting: { color: "warning", icon: "solar:refresh-circle-bold", label: "Restarting" },
  starting: { color: "primary", icon: "solar:refresh-circle-bold", label: "Starting" },
  down: { color: "danger", icon: "solar:close-circle-bold", label: "Down" },
  failed: { color: "danger", icon: "solar:close-circle-bold", label: "Failed" },
};

/** Design ProMax card tokens: bg-content1, border-default-200, text-small */
const AgentStatusPanel = React.forwardRef<HTMLDivElement, AgentStatusPanelProps>(
  ({ agents, className, ...props }, ref) => {
    return (
      <Card
        ref={ref}
        className={cn("border-small border-default-200 bg-content1", className)}
        shadow="sm"
        {...props}
      >
        <CardHeader className="flex gap-2 px-4 pb-0 pt-4">
          <Icon className="text-primary" icon="solar:radar-2-bold" width={18} />
          <p className="text-small font-medium text-default-700">Match status</p>
        </CardHeader>
        <CardBody className="gap-2 px-4 pb-4">
          {agents.map((agent) => {
            const meta = statusMeta[agent.status] ?? statusMeta.down;
            return (
              <div
                key={agent.label}
                className="flex items-center justify-between rounded-medium border-small border-default-100 bg-content2 px-3 py-2.5"
              >
                <div>
                  <p className="text-tiny uppercase tracking-wider text-default-400">
                    {agent.label}
                  </p>
                  <p className="text-small font-medium text-default-700">{agent.name}</p>
                </div>
                <Chip
                  size="sm"
                  variant="flat"
                  color={meta.color}
                  startContent={<Icon icon={meta.icon} width={14} />}
                  className="gap-1"
                >
                  {meta.label}
                </Chip>
              </div>
            );
          })}
          <p className="pt-1 text-tiny leading-relaxed text-default-400">
            Live status for everyone in the room. If someone drops, the match recovers or pauses
            cleanly.
          </p>
        </CardBody>
      </Card>
    );
  },
);

AgentStatusPanel.displayName = "AgentStatusPanel";

export default AgentStatusPanel;
export { AgentStatusPanel };
