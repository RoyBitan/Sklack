/**
 * Services Index
 * Main entry point for all services
 */

// API Services
export * from "./api";

// Error types
export * from "./errors";

// Legacy service (Gemini AI)
export { getSmartAnalysis, translateText } from "./geminiService";
