"use server";

import fs from 'fs/promises';
import path from 'path';
import { BridgeRequest, BridgeResponse } from './types';

const BRIDGE_DIR = path.join(process.cwd(), '.bridge');
const REQUEST_FILE = path.join(BRIDGE_DIR, 'request.json');
const RESPONSE_FILE = path.join(BRIDGE_DIR, 'response.json');

// Next.js 16 'use cache' for static syllabus data
export async function getSyllabusStatus() {
    "use cache";
    return {
        bloque1: { name: "Común", count: "6/6" },
        bloque2: { name: "Gestión", count: "17/17" },
        suggestion: "Pregúntame sobre las diferencias entre el Impuesto de Sociedades y el IRPF en retenciones."
    };
}

export async function queryNotebookLM(query: string) {
    try {
        await fs.mkdir(BRIDGE_DIR, { recursive: true });
    } catch (e) { }

    const timestamp = Date.now();
    const requestId = Math.random().toString(36).substring(7);
    
    const requestData: BridgeRequest = { id: requestId, query, timestamp };
    await fs.writeFile(REQUEST_FILE, JSON.stringify(requestData));
    console.log(`[Bridge] Sent request ${requestId}: ${query.substring(0, 50)}...`);

    const start = Date.now();
    const timeout = 120000;
    let delay = 500; // Start with 500ms

    while (Date.now() - start < timeout) {
        try {
            const exists = await fs.stat(RESPONSE_FILE).then(() => true).catch(() => false);
            if (exists) {
                const content = await fs.readFile(RESPONSE_FILE, 'utf-8');
                if (content && content.trim()) {
                    let data: BridgeResponse;
                    try {
                        data = JSON.parse(content);
                    } catch (parseError) {
                        // File might be mid-write, wait a tiny bit and retry
                        await new Promise(resolve => setTimeout(resolve, 200));
                        continue;
                    }

                    if (data.requestId === requestId || data.requestTimestamp >= timestamp) {
                        console.log(`[Bridge] Received valid response for ${requestId}`);
                        await fs.unlink(RESPONSE_FILE).catch(() => {}); 
                        return {
                            content: data.answer,
                            sources: data.sources || []
                        };
                    }
                }
            }
        } catch (e) {
            console.error("[Bridge] Polling error:", e);
        }
        
        // Adaptive polling: poll faster at the beginning, then slow down
        await new Promise(resolve => setTimeout(resolve, delay));
        if (delay < 3000) delay += 500; 
    }

    throw new Error("NotebookLM response timeout (120s). Estaba analizando tus manuales pero tardé demasiado. Por favor, reintenta ahora que estoy preparado.");
}
