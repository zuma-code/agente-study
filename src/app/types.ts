export interface Notebook {
    id: string;
    name: string;
    description: string;
    fileCount: number;
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