import { pgTable, text, timestamp, uuid, integer } from 'drizzle-orm/pg-core';
import { profiles } from './users';

export const feedback = pgTable('feedback', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => profiles.id),
  subject: text('subject').notNull(),
  message: text('message').notNull(),
  type: text('type').notNull(), // 'bug', 'feature', 'general', etc.
  priority: text('priority').default('medium'), // 'low', 'medium', 'high'
  status: text('status').default('open'), // 'open', 'in-progress', 'resolved', 'closed'
  userEmail: text('user_email'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export type Feedback = typeof feedback.$inferSelect;
export type NewFeedback = typeof feedback.$inferInsert; 