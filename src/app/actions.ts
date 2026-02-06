"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";
import { Notebook } from "./types";

// Cargar API KEY de .env.local
let API_KEY = process.env.GEMINI_API_KEY || "";
try {
    const envPath = path.join(process.cwd(), ".env.local");
    if (fs.existsSync(envPath)) {
        const envLocal = fs.readFileSync(envPath, "utf-8");
        const apiKeyMatch = envLocal.match(/GEMINI_API_KEY=(.*)/);
        if (apiKeyMatch) API_KEY = apiKeyMatch[1].trim();
    }
} catch (e) {
    console.warn("No se pudo leer .env.local, usando variables de entorno.");
}

const genAI = new GoogleGenerativeAI(API_KEY);

export async function getNotebooks(): Promise<Notebook[]> {
    try {
        const metadataPath = path.join(process.cwd(), "manuales_metadata.json");
        if (!fs.existsSync(metadataPath)) return [];
        
        const manuals = JSON.parse(fs.readFileSync(metadataPath, "utf-8"));
        
        // Agrupamos por cuadernos lógicos o simplemente mostramos los documentos
        return [
            { 
                id: "aeat-all", 
                name: "Manuales AEAT 2026", 
                description: "Biblioteca completa de preparación", 
                fileCount: manuals.length 
            }
        ];
    } catch (e) {
        return [];
    }
}

export async function getActiveManuals() {
    try {
        const metadataPath = path.join(process.cwd(), "manuales_metadata.json");
        if (!fs.existsSync(metadataPath)) return [];
        return JSON.parse(fs.readFileSync(metadataPath, "utf-8"));
    } catch (e) {
        return [];
    }
}

export async function getSyllabusStatus() {
    "use cache";
    return {
        bloque1: { name: "Común", count: "Constitución + LGT" },
        bloque2: { name: "Gestión", count: "Reglamentos" },
        suggestion: "¿Cuáles son los plazos de prescripción según el Art. 66 de la LGT?"
    };
}

export async function queryNotebookLM(query: string, notebookId: string = "aeat-bloque2") {

    if (!API_KEY) {

        throw new Error("API Key no configurada.");

    }



    const maxRetries = 2;

    let attempt = 0;



    while (attempt <= maxRetries) {

        try {

            const metadataPath = path.join(process.cwd(), "manuales_metadata.json");

            let allManuals = [];

            if (fs.existsSync(metadataPath)) {

                allManuals = JSON.parse(fs.readFileSync(metadataPath, "utf-8"));

            }



            // Filtrar manuales según el cuaderno

            const manuals = notebookId === "aeat-bloque1" 

                ? allManuals.filter(m => m.displayName.toLowerCase().includes("constitucion") || m.displayName.toLowerCase().includes("ley"))

                : allManuals.filter(m => !m.displayName.toLowerCase().includes("constitucion") && !m.displayName.toLowerCase().includes("ley"));



            const model = genAI.getGenerativeModel({ 

                model: "gemini-1.5-flash",

            });



            const fileData = manuals.map((m: any) => ({

                fileData: {

                    mimeType: "application/pdf",

                    fileUri: m.uri

                }

            }));



            const systemPart = { text: `Eres el Agente AEAT experto. Estas trabajando en el cuaderno: ${notebookId}. Responde basándote en los documentos proporcionados.` };



            const parts = [

                systemPart,

                ...fileData,

                { text: query }

            ];



            const result = await model.generateContent({

                contents: [{ role: 'user', parts }],

                generationConfig: {

                    maxOutputTokens: 2048,

                    temperature: 0.7,

                }

            });

            

            const response = await result.response;

            const text = response.text();



            return {

                content: text,

                sources: manuals.map((m: any) => m.displayName),

                citations: [], 

                suggestions: [

                    "Ponme un ejemplo práctico de esto",

                    "¿Cómo suele preguntarse esto en el examen?",

                    "¿Qué plazos establece el Reglamento para esto?"

                ]

            };

        } catch (error: any) {

            if (error?.message?.includes("429") && attempt < maxRetries) {

                console.log(`[Quota] Límite alcanzado. Reintentando en 30s... (Intento ${attempt + 1})`);

                await new Promise(resolve => setTimeout(resolve, 30000));

                attempt++;

                continue;

            }

            console.error("Gemini API Error Detail:", error);

            const specificError = error?.message || "Error desconocido";

            throw new Error(`Error en el motor: ${specificError}`);

        }

    }

}
