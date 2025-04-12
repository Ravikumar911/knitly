import { eq, and } from "drizzle-orm";
import { db } from "../";
import { z } from "zod";
import { aiAnalysis } from "../schema/aiAnalysis";
import { FinancialData } from "../types";



export async function storeAIAnalysis({
  userId,
  parsedThreadId,
  analysis
}: {
  userId: string;
    parsedThreadId: string;
  analysis: FinancialData;
}) {
  
  const result = await db.insert(aiAnalysis).values({
    userId,
    parsedThreadId,
    detectedProvider: analysis.detectedProvider,
    emailType: analysis.emailType,
    emailSubject: analysis.emailSubject,
    transactionData: analysis.transaction || null,
    parseSuccess: analysis.parseSuccess,
    parseErrors: analysis.parseErrors || [],
    confidenceScore: analysis.confidenceScore,
    dataSource: analysis.dataSource || null,
    verificationStatus: analysis.verificationStatus || null,
  }).returning();
  
  return result[0];
}

export async function getAIAnalysisByThreadId(parsedThreadId: string) {
  
  const result = await db
    .select()
    .from(aiAnalysis)
    .where(eq(aiAnalysis.parsedThreadId, parsedThreadId))
    .limit(1);
    
  return result[0];
}

export async function getAIAnalysisByUserId(userId: string) {
  
  return db
    .select()
    .from(aiAnalysis)
    .where(eq(aiAnalysis.userId, userId))
    .orderBy(aiAnalysis.createdAt);
}

export async function getSuccessfulAnalyses(userId: string) {
  return db
    .select()
    .from(aiAnalysis)
    .where(and(eq(aiAnalysis.userId, userId), eq(aiAnalysis.parseSuccess, true)))
    .orderBy(aiAnalysis.createdAt);
} 