import { db } from '../../index';
import { emailExtractionPatterns } from '../../schema/emailExtractionPatterns';
import { eq } from 'drizzle-orm';
import type { EmailExtractionPattern } from '../../types';

/**
 * Gets all active email extraction patterns
 */
export async function getEmailExtractionPatterns() {
  return await db.select()
    .from(emailExtractionPatterns)
    .where(eq(emailExtractionPatterns.isActive, true))
    .orderBy(emailExtractionPatterns.priority);
}

/**
 * Creates a new email extraction pattern
 */
export async function createEmailExtractionPattern(data: Omit<EmailExtractionPattern, 'id' | 'createdAt' | 'updatedAt'>) {
  return await db.insert(emailExtractionPatterns).values({
    emailPattern: data.emailPattern,
    subjectPattern: data.subjectPattern,
    bodyPattern: data.bodyPattern,
    extractionType: data.extractionType,
    config: data.config,
    priority: data.priority || 0,
    isActive: data.isActive ?? true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();
}

/**
 * Updates an existing email extraction pattern
 */
export async function updateEmailExtractionPattern(id: string, data: Partial<EmailExtractionPattern>) {
  const updateData: any = {
    updatedAt: new Date(),
  };

  if (data.emailPattern !== undefined) updateData.emailPattern = data.emailPattern;
  if (data.subjectPattern !== undefined) updateData.subjectPattern = data.subjectPattern;
  if (data.bodyPattern !== undefined) updateData.bodyPattern = data.bodyPattern;
  if (data.extractionType !== undefined) updateData.extractionType = data.extractionType;
  if (data.config !== undefined) updateData.config = data.config;
  if (data.priority !== undefined) updateData.priority = data.priority;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  return await db.update(emailExtractionPatterns)
    .set(updateData)
    .where(eq(emailExtractionPatterns.id, id))
    .returning();
}

/**
 * Deletes an email extraction pattern
 */
export async function deleteEmailExtractionPattern(id: string) {
  return await db.delete(emailExtractionPatterns)
    .where(eq(emailExtractionPatterns.id, id))
    .returning();
}

/**
 * Gets a single email extraction pattern by ID
 */
export async function getEmailExtractionPattern(id: string) {
  const results = await db.select()
    .from(emailExtractionPatterns)
    .where(eq(emailExtractionPatterns.id, id))
    .limit(1);
  
  return results[0];
} 