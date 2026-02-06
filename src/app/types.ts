export interface Notebook {
    id: string;
    name: string;
    description: string;
    fileCount: number;
}

export interface Note {
    id: string;
    title: string;
    content: string;
    timestamp: number;
}

export interface Flashcard {
    id: string;
    front: string;
    back: string;
    mastered: boolean;
}

export interface QuizQuestion {
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
}

export interface Quiz {
    title: string;
    questions: QuizQuestion[];
}

export interface ExamResult {
    id: string;
    title: string;
    themeId?: number;
    score: number;
    total: number;
    timestamp: number;
}

export interface Citation {
    index: string;
    snippet: string;
    sourceName: string;
}

export interface Message {
    role: 'user' | 'assistant' | 'error';
    content: string;
    sources?: string[];
    citations?: Citation[];
    suggestions?: string[];
}

export interface BridgeRequest {
    id: string;
    query: string;
    timestamp: number;
}

export interface BridgeResponse {
    requestId: string;
    requestTimestamp: number;
    answer: string;
    sources?: string[];
    citations?: Citation[];
    suggestions?: string[];
}