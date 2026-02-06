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

export interface BridgeResponse {
    requestId: string;
    requestTimestamp: number;
    answer: string;
    sources?: string[];
    citations?: Citation[];
    suggestions?: string[];
}
