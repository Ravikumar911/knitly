import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import {
  createChat,
  getChatById,
  getUserChats,
  deleteChat,
  saveMessage,
  updateChatTitle,
} from "@workspace/database";
import { TRPCError } from "@trpc/server";

export const chatRouter = createTRPCRouter({
  // Get chat by ID with messages
  getById: protectedProcedure
    .input(z.object({ chatId: z.string() }))
    .query(async ({ input, ctx }) => {
      const chat = await getChatById(input.chatId, ctx.userId!);

      if (!chat) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Chat not found",
        });
      }

      return chat;
    }),

  // List user chats
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ input, ctx }) => {
      const chats = await getUserChats(ctx.userId!, input.limit, input.offset);

      return {
        chats,
        hasMore: chats.length === input.limit,
      };
    }),

  // Create new chat
  create: protectedProcedure
    .input(z.object({ title: z.string().min(1).max(255) }))
    .mutation(async ({ input, ctx }) => {
      const chat = await createChat(ctx.userId!, input.title);
      return chat;
    }),

  // Delete chat
  delete: protectedProcedure
    .input(z.object({ chatId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const success = await deleteChat(input.chatId, ctx.userId!);

      if (!success) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Chat not found or already deleted",
        });
      }

      return { success: true };
    }),

  // Update title
  updateTitle: protectedProcedure
    .input(
      z.object({
        chatId: z.string(),
        title: z.string().min(1).max(255),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const success = await updateChatTitle(
        input.chatId,
        ctx.userId!,
        input.title,
      );

      if (!success) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Chat not found",
        });
      }

      return { success: true };
    }),

  // Save message (called from API route)
  saveMessage: protectedProcedure
    .input(
      z.object({
        chatId: z.string(),
        role: z.enum(["user", "assistant", "system"]),
        parts: z.any(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Verify user owns this chat
      const chat = await getChatById(input.chatId, ctx.userId!);

      if (!chat) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Chat not found",
        });
      }

      const message = await saveMessage(input.chatId, input.role, input.parts);
      return message;
    }),
});
