export enum UserRole {
  OWNER = 'owner',
  MEMBER = 'member',
}

export interface UserProfile {
  uid: string;
  displayName?: string | null;
  email: string | null;
  photoURL?: string | null;
  householdId?: string;
  geminiApiKey?: string | null;
}

export interface Household {
  id: string;
  name: string;
  ownerId: string;
  members: string[];
  budget: Record<string, number>;
  monthlyIncome?: number;
}

export interface Expense {
  id: string;
  amount: number;
  category: string;
  merchant: string;
  date: string;
  userId: string;
  householdId: string;
  isRecurring?: boolean;
  recurringId?: string;
  sharedWith?: string[];
  confidence?: number;
  installments?: number;
  installmentIndex?: number;
}

export interface Goal {
  id: string;
  title: string;
  targetAmount: number;
  savedAmount: number;
  category: string;
  householdId: string;
}

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  frequency: string;
  nextDueDate: string;
  householdId: string;
  status: 'active' | 'pending' | 'action_needed';
}

export interface FixedExpense {
  id: string;
  name: string;
  amount: number;
  category: string;
  dueDate: number; // Day of the month (1-31)
  householdId: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}
