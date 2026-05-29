"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./collapsible";
import { cn } from "../lib/utils";

const Task = React.forwardRef<
  React.ElementRef<typeof Collapsible>,
  React.ComponentPropsWithoutRef<typeof Collapsible>
>(({ className, ...props }, ref) => (
  <Collapsible
    ref={ref}
    className={cn("rounded-lg border", className)}
    {...props}
  />
));
Task.displayName = "Task";

const TaskTrigger = React.forwardRef<
  React.ElementRef<typeof CollapsibleTrigger>,
  React.ComponentPropsWithoutRef<typeof CollapsibleTrigger> & {
    title: string;
  }
>(({ className, title, children, ...props }, ref) => (
  <CollapsibleTrigger
    ref={ref}
    className={cn(
      "flex w-full items-center justify-between p-4 text-left hover:bg-accent hover:text-accent-foreground [&[data-state=open]>svg]:rotate-180",
      className,
    )}
    {...props}
  >
    <span className="font-medium">{title}</span>
    <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
    {children}
  </CollapsibleTrigger>
));
TaskTrigger.displayName = "TaskTrigger";

const TaskContent = React.forwardRef<
  React.ElementRef<typeof CollapsibleContent>,
  React.ComponentPropsWithoutRef<typeof CollapsibleContent>
>(({ className, ...props }, ref) => (
  <CollapsibleContent
    ref={ref}
    className={cn(
      "overflow-hidden text-sm transition-all data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down",
      className,
    )}
    {...props}
  />
));
TaskContent.displayName = "TaskContent";

const TaskItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center px-4 py-2 text-sm text-muted-foreground",
      className,
    )}
    {...props}
  />
));
TaskItem.displayName = "TaskItem";

const TaskItemFile = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "inline-flex items-center gap-1 rounded bg-muted px-2 py-1 text-xs font-medium",
      className,
    )}
    {...props}
  />
));
TaskItemFile.displayName = "TaskItemFile";

export { Task, TaskContent, TaskItem, TaskItemFile, TaskTrigger };
