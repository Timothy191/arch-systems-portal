"use client";

import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogClose 
} from "@repo/ui/ui/dialog";
import { Button } from "@repo/ui/ui/button";
import { X, Bot } from 'lucide-react';

interface EveAgent {
  id: string;
  enabled: boolean;
  activeCount: number;
}

export const EveDrawer = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const [agents, setAgents] = useState<EveAgent[]>([]);

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/ops/gateway/eve-list', {
        headers: { 'x-ops-secret': 'dev-secret-key-123' }
      });
      const data = await response.json();
      setAgents(data.eves);
    } catch (error) {
      console.error('Failed to fetch eve agents', error);
    }
  };

  useEffect(() => {
    if (open) fetchAgents();
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-background border border-border sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Bot size={20} className="text-foreground" />
            eve control plane
          </DialogTitle>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" className="absolute right-4 top-4 text-foreground hover:bg-secondary">
              <X size={16} />
            </Button>
          </DialogClose>
        </DialogHeader>
        
        <div className="mt-4">
          <p className="text-sm font-medium text-muted-foreground mb-2">active agents</p>
          <div className="space-y-2">
            {agents.map((agent) => (
              <div key={agent.id} className="p-3 border border-border bg-secondary rounded-md flex justify-between items-center">
                <span className="text-sm font-mono text-foreground">{agent.id}</span>
                <span className="text-xs text-muted-foreground">
                  {agent.enabled ? 'active' : 'disabled'} | {agent.activeCount} running
                </span>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
