"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useTimerState } from "@/lib/queries";

interface IdleDialogState {
  open: boolean;
  idleStartTime: number;
}

export function IdleDialog() {
  const [state, setState] = useState<IdleDialogState | null>(null);
  const { data: timerState } = useTimerState();

  useEffect(() => {
    const handleIdleDetected = (data: { idleStartTime: number }) => {
      setState({ open: true, idleStartTime: data.idleStartTime });
    };

    window.electronEvents.onIdleDetected(handleIdleDetected);
    return () => {
      window.electronEvents.onIdleDetected(() => {});
    };
  }, []);

  const handleDiscard = async () => {
    if (!state) return;
    await api.idle.discardTime({ idleStartTime: state.idleStartTime });
    setState(null);
  };

  const handleKeepTime = () => {
    setState(null);
  };

  const handleStopTimer = async () => {
    await api.timer.stop();
    setState(null);
  };

  if (!state) return null;

  return (
    <Dialog
      open={state.open}
      onOpenChange={(open) => {
        if (!open) setState(null);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Were you working?</DialogTitle>
          <DialogDescription>
            The timer was running while your system was idle. What would you
            like to do with the idle time?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleDiscard}>
            Discard idle time
          </Button>
          <Button variant="secondary" onClick={handleStopTimer}>
            Stop timer
          </Button>
          <Button onClick={handleKeepTime}>Keep time</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
