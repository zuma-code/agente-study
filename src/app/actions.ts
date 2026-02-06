"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { BridgeResponse } from './types';

// Initializing the Gemini API with your Key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Next.js 16 'use cache' for static syllabus data
export async function getSyllabusStatus() {
    "use cache";
    return {
        bloque1: { name: "Común", count: "6/6" },
        bloque2: { name: "Gestión", count: "17/17" },
        suggestion: "Explícame los plazos de prescripción según el Art. 66 de la LGT."
    };
}

export async function queryNotebookLM(query: string) {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error("API Key no configurada. Por favor, añádela a tu archivo .env.local");
    }

    try {
        // Use gemini-2.0-flash for high speed and reasoning
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.0-flash",
            systemInstruction: "Eres el Agente AEAT, un asistente experto en el temario de Agente de Hacienda Pública. Tu objetivo es ayudar al usuario a aprobar el examen de 2026. Responde siempre basándote en la normativa vigente (LGT, Reglamentos). Si no tienes acceso directo a un manual específico en este momento, utiliza tu conocimiento experto pero indica que es información general normativa. Mantén un tono profesional y estructurado con Markdown."
        });

        const chat = model.startChat({
            history: [],
            generationConfig: {
                maxOutputTokens: 2048,
            },
        });

        const result = await chat.sendMessage(query);
        const response = await result.response;
        const text = response.text();

        // Simulate the structure we had before for UI compatibility
        return {
            content: text,
            sources: ["Base de Datos Normativa AEAT"], // Later we will add real file sources
            citations: [],
            suggestions: [
                "¿Qué dice el artículo siguiente?",
                "Ponme un ejemplo práctico de esto",
                "¿Cómo suele caer esto en el examen?"
            ]
        };
    } catch (error) {
        console.error("Gemini API Error:", error);
        throw new Error("Error al conectar con el cerebro de Gemini. Revisa tu conexión o API Key.");
    }
}
