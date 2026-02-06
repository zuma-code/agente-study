export interface Message {
    role: 'user' | 'assistant';
    content: string;
    sources?: string[];
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
}
