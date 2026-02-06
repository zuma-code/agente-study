"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";

// Cargar API KEY de .env.local
const envLocal = fs.readFileSync(".env.local", "utf-8");
const apiKeyMatch = envLocal.match(/GEMINI_API_KEY=(.*)/);
const API_KEY = apiKeyMatch ? apiKeyMatch[1].trim() : process.env.GEMINI_API_KEY || "";

const genAI = new GoogleGenerativeAI(API_KEY);

export async function getSyllabusStatus() {
    "use cache";
    return {
        bloque1: { name: "Común", count: "Constitución + LGT" },
        bloque2: { name: "Gestión", count: "Reglamentos" },
        suggestion: "¿Cuáles son los plazos de prescripción según el Art. 66 de la LGT?"
    };
}

export async function queryNotebookLM(query: string) {
    if (!API_KEY) {
        throw new Error("API Key no configurada.");
    }

    try {
        const metadataPath = path.join(process.cwd(), "manuales_metadata.json");
        let manuals = [];
        if (fs.existsSync(metadataPath)) {
            manuals = JSON.parse(fs.readFileSync(metadataPath, "utf-8"));
        }

        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.0-flash",
            systemInstruction: "Eres el Agente AEAT experto. Responde ÚNICAMENTE basándote en los documentos proporcionados. Si la información no está en los manuales, indícalo. Estructura con Markdown y usa un tono de preparador de oposiciones."
        });

        // Configurar los archivos como parte del contenido inicial (Grounding)
        const fileData = manuals.map((m: any) => ({
            fileData: {
                mimeType: "application/pdf",
                fileUri: m.uri
            }
        }));

        const chat = model.startChat({
            history: [],
        });

        // Enviamos los archivos y la consulta en el mismo mensaje para contexto total
        const result = await chat.sendMessage([...fileData, query]);
        const response = await result.response;
        const text = response.text();

        return {
            content: text,
            sources: manuals.map((m: any) => m.displayName),
            citations: [], // El modelo 2.0-flash maneja las citas dentro del texto
            suggestions: [
                "Ponme un ejemplo práctico de esto",
                "¿Cómo suele preguntarse esto en el examen?",
                "¿Qué plazos establece el Reglamento para esto?"
            ]
        };
    } catch (error) {
        console.error("Gemini API Error:", error);
        throw new Error("Error en el motor de estudio. Revisa la consola.");
    }
}
