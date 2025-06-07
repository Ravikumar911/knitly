import { eq, desc } from 'drizzle-orm';
import { db } from '../index';
import { feedback, type NewFeedback, type Feedback } from '../schema/feedback';

export async function createFeedback(data: Omit<NewFeedback, 'id' | 'createdAt' | 'updatedAt'>) {
  const [newFeedback] = await db.insert(feedback).values({
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();
  
  return newFeedback;
}

export async function getFeedbackById(id: string): Promise<Feedback | null> {
  const [result] = await db.select().from(feedback).where(eq(feedback.id, id));
  return result || null;
}

export async function getFeedbackByUserId(userId: string): Promise<Feedback[]> {
  return await db.select().from(feedback).where(eq(feedback.userId, userId)).orderBy(desc(feedback.createdAt));
}

export async function getAllFeedback(): Promise<Feedback[]> {
  return await db.select().from(feedback).orderBy(desc(feedback.createdAt));
}

export async function updateFeedbackStatus(id: string, status: string) {
  const [updatedFeedback] = await db.update(feedback)
    .set({ 
      status,
      updatedAt: new Date(),
    })
    .where(eq(feedback.id, id))
    .returning();
    
  return updatedFeedback;
} 