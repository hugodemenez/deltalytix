"use client";

import { Button } from "@/components/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import type { ToolUIPart } from "ai";
import type { ComponentProps, ReactNode } from "react";
import { createContext, useContext } from "react";

type ToolUIPartApproval =
  | { id: string; approved?: never; reason?: never }
  | { id: string; approved: boolean; reason?: string }
  | undefined;

type ConfirmationContextValue = {
  approval: ToolUIPartApproval;
  state: ToolUIPart["state"];
};

const ConfirmationContext = createContext<ConfirmationContextValue | null>(
  null
);

const useConfirmation = () => {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error("Confirmation components must be used within Confirmation");
  }
  return context;
};

export type ConfirmationProps = ComponentProps<typeof Item> & {
  approval?: ToolUIPartApproval;
  state: ToolUIPart["state"];
};

export const Confirmation = ({
  approval,
  state,
  variant = "outline",
  size = "sm",
  ...props
}: ConfirmationProps) => {
  if (!approval || state === "input-streaming" || state === "input-available") {
    return null;
  }

  return (
    <ConfirmationContext.Provider value={{ approval, state }}>
      <Item variant={variant} size={size} role="group" {...props} />
    </ConfirmationContext.Provider>
  );
};

export type ConfirmationIconProps = ComponentProps<typeof ItemMedia>;

export const ConfirmationIcon = (props: ConfirmationIconProps) => (
  <ItemMedia variant="icon" {...props} />
);

export type ConfirmationTitleProps = ComponentProps<typeof ItemTitle> & {
  description?: ReactNode;
};

export const ConfirmationTitle = ({
  description,
  ...props
}: ConfirmationTitleProps) => (
  // The minimum width moves the actions to their own row in narrow chats.
  <ItemContent className="min-w-48">
    <ItemTitle {...props} />
    {description && <ItemDescription>{description}</ItemDescription>}
  </ItemContent>
);

export type ConfirmationRequestProps = { children?: ReactNode };

export const ConfirmationRequest = ({ children }: ConfirmationRequestProps) => {
  const { state } = useConfirmation();
  return state === "approval-requested" ? children : null;
};

const isAnswered = (state: ToolUIPart["state"]) =>
  state === "approval-responded" ||
  state === "output-denied" ||
  state === "output-available";

export type ConfirmationAcceptedProps = { children?: ReactNode };

export const ConfirmationAccepted = ({
  children,
}: ConfirmationAcceptedProps) => {
  const { approval, state } = useConfirmation();
  return approval?.approved === true && isAnswered(state) ? children : null;
};

export type ConfirmationRejectedProps = { children?: ReactNode };

export const ConfirmationRejected = ({
  children,
}: ConfirmationRejectedProps) => {
  const { approval, state } = useConfirmation();
  return approval?.approved === false && isAnswered(state) ? children : null;
};

export type ConfirmationActionsProps = ComponentProps<typeof ItemActions>;

export const ConfirmationActions = (props: ConfirmationActionsProps) => {
  const { state } = useConfirmation();
  return state === "approval-requested" ? <ItemActions {...props} /> : null;
};

export type ConfirmationActionProps = ComponentProps<typeof Button>;

export const ConfirmationAction = ({
  size = "sm",
  ...props
}: ConfirmationActionProps) => <Button size={size} type="button" {...props} />;
