import { request } from "./client";
import type { Message, MessageThread } from "./types";

export const listThreads = () => request<MessageThread[]>("/messages/threads");
export const getThread = (partnerId: string) => request<Message[]>(`/messages/${partnerId}`);
export const sendMessage = (recipientId: string, body: string) =>
  request<Message>("/messages", { method: "POST", body: JSON.stringify({ recipient_id: recipientId, body }) });
