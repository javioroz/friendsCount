// Types for FriendsCount App

export interface Member {
  id: string;
  name: string;
  email: string;
}

export interface Expense {
  id: string;
  groupId: string;
  description: string;
  amount: number;
  paidBy: string; // Member ID
  sharedBy: string[]; // Array of Member IDs
  date: string;
  category?: string;
}

export interface Favor {
  id: string;
  groupId: string;
  description: string;
  madeBy: string; // Member ID - who did the favor
  date: string;
  isAIUsed?: boolean;
  manualScore?: number;
  aiResponse?: {
    score: number;
    message: string;
    nickname: string;
  };
}

export interface Balance {
  memberId: string;
  amount: number; // Positive or negative
}

export interface Settlement {
  from: string; // Member ID
  to: string; // Member ID
  amount: number;
}

export interface MemberRanking {
  memberId: string;
  nickname: string;
  score: number;
}

export interface Group {
  id: string;
  name: string;
  icon: string;
  currency?: string;
  llmApiKey?: string;
  llmModel?: string; // Model name for the LLM (e.g., "gpt-4", "claude-3")
  llmEndpoint?: string; // Custom endpoint URL (optional, defaults to OpenAI-compatible)
  members: Member[];
  expenses: Expense[];
  favors: Favor[];
  balances: Balance[];
  rankings: MemberRanking[];
  groupKey?: string;
  aiConversationId?: string; // For Claude conversation context
  createdAt: string;
}

export interface GroupMeta {
  name: string;
  createdAd: string;
  createdBy: Member["id"]; // Member ID
}