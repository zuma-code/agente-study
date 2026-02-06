"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager, FileState } from "@google/generative-ai/server";
import fs from "fs";
import path from "path";
import { Notebook } from "./types";

// Cargar API KEY de .env.local de forma segura
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

export async function syncManuals() {
    if (!API_KEY) throw new Error("API Key no configurada.");
    
    const fileManager = new GoogleAIFileManager(API_KEY);
    const MANUALS_DIR = path.join(process.cwd(), "manuales_aeat");
    const METADATA_FILE = path.join(process.cwd(), "manuales_metadata.json");

    try {
        if (!fs.existsSync(MANUALS_DIR)) fs.mkdirSync(MANUALS_DIR);
        const files = fs.readdirSync(MANUALS_DIR).filter(f => f.endsWith(".pdf"));
        const indexedFiles = [];

        for (const fileName of files) {
            const filePath = path.join(MANUALS_DIR, fileName);
            const uploadResult = await fileManager.uploadFile(filePath, {
                mimeType: "application/pdf",
                displayName: fileName,
            });

            let file = await fileManager.getFile(uploadResult.file.name);
            while (file.state === FileState.PROCESSING) {
                await new Promise((resolve) => setTimeout(resolve, 2000));
                file = await fileManager.getFile(uploadResult.file.name);
            }

            indexedFiles.push({
                name: file.name,
                displayName: file.displayName,
                uri: file.uri
            });
        }

        fs.writeFileSync(METADATA_FILE, JSON.stringify(indexedFiles, null, 2));
        return { success: true, count: indexedFiles.length };
    } catch (error: any) {
        console.error("Sync Error:", error);
        throw new Error("Error al sincronizar manuales: " + error.message);
    }
}

export async function getNotebooks(): Promise<Notebook[]> {
    try {
        const metadataPath = path.join(process.cwd(), "manuales_metadata.json");
        if (!fs.existsSync(metadataPath)) return [];
        const manuals = JSON.parse(fs.readFileSync(metadataPath, "utf-8"));
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

export async function getSyllabusProgress() {
    try {
        const progressPath = path.join(process.cwd(), "syllabus_progress.json");
        if (fs.existsSync(progressPath)) {
            return JSON.parse(fs.readFileSync(progressPath, "utf-8"));
        }
        const basePath = path.join(process.cwd(), "src/app/syllabus.json");
        return JSON.parse(fs.readFileSync(basePath, "utf-8"));
    } catch (e) {
        return [];
    }
}

export async function toggleThemeCompletion(themeId: number) {
    try {
        const progressPath = path.join(process.cwd(), "syllabus_progress.json");
        let syllabus = await getSyllabusProgress();
        syllabus = syllabus.map((t: any) => t.id === themeId ? { ...t, completed: !t.completed } : t);
        fs.writeFileSync(progressPath, JSON.stringify(syllabus, null, 2));
        return { success: true };
    } catch (e) {
        throw new Error("No se pudo actualizar el progreso.");
    }
}

export async function queryNotebookLM(query: string, notebookId: string = "aeat-all", selectedManualNames: string[] = []) {
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

            let manuals = allManuals;
            if (selectedManualNames.length > 0) {
                manuals = allManuals.filter(m => selectedManualNames.includes(m.displayName));
            }

            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

            const fileData = manuals.map((m: any) => ({
                fileData: { mimeType: "application/pdf", fileUri: m.uri }
            }));

            const systemPart = { text: `Eres el "Preparador de Élite de Agente de Hacienda". Tu objetivo es que el usuario apruebe la oposición. 
            - Sé riguroso y cita siempre el artículo de la LGT, RGR, RGGI o la Constitución.
            - Si algo es muy preguntable en examen, indícalo con un aviso de "OJO EXAMEN".
            - Explica conceptos complejos con ejemplos prácticos de la vida tributaria real.
            - Usa un tono profesional pero motivador.` };
            const parts = [systemPart, ...fileData, { text: query }];

            const result = await model.generateContent({
                contents: [{ role: 'user', parts }],
                generationConfig: { maxOutputTokens: 2048, temperature: 0.7 }
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
                await new Promise(resolve => setTimeout(resolve, 30000));
                attempt++;
                continue;
            }
            console.error("Gemini API Error Detail:", error);
            throw new Error(`Error en el motor: ${error?.message || "Error desconocido"}`);
        }
    }
}

export async function generateQuiz(notebookId: string = "aeat-all", selectedManualNames: string[] = [], count: number = 5, themeId?: number) {
    if (!API_KEY) throw new Error("API Key no configurada.");

    try {
        const metadataPath = path.join(process.cwd(), "manuales_metadata.json");
        let allManuals = JSON.parse(fs.readFileSync(metadataPath, "utf-8"));
        let manuals = allManuals;
        if (selectedManualNames.length > 0) {
            manuals = allManuals.filter(m => selectedManualNames.includes(m.displayName));
        }

        const syllabus = await getSyllabusProgress();
        const activeTheme = themeId ? syllabus.find((t: any) => t.id === themeId) : null;

        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.0-flash",
            generationConfig: { responseMimeType: "application/json" }
        });

        const fileData = manuals.map((m: any) => ({
            fileData: { mimeType: "application/pdf", fileUri: m.uri }
        }));

        const topicContext = activeTheme ? `Céntrate EXCLUSIVAMENTE en el Tema ${activeTheme.id}: ${activeTheme.title}. Referencias: ${activeTheme.refs || 'Ley General Tributaria y Reglamentos'}.` : 'Usa todos los manuales para un examen general.';

        const prompt = `Genera un cuestionario de autoevaluación de ${count} preguntas tipo test nivel OPOSICIÓN AEAT.
        ${topicContext}
        - Dificultad: Alta.
        - Los distractores deben ser artículos parecidos o plazos diferentes para forzar la precisión.
        Devuelve un objeto JSON: { \"title\": \"${activeTheme ? 'Examen T' + themeId : 'Simulacro General'}\", \"questions\": [ { \"question\": \"Pregunta\", \"options\": [\"A\", \"B\", \"C\", \"D\"], \"correctAnswer\": 0, \"explanation\": \"Explicación detallada con cita al artículo\" } ] }`;

        const result = await model.generateContent([...fileData, prompt]);
        return JSON.parse(result.response.text());
    } catch (error: any) {
        console.error("Quiz Error:", error);
        throw new Error("No se pudo generar el test.");
    }
}

export async function generateSourceSummary(manualDisplayName: string) {
    if (!API_KEY) throw new Error("API Key no configurada.");

    try {
        const metadataPath = path.join(process.cwd(), "manuales_metadata.json");
        const allManuals = JSON.parse(fs.readFileSync(metadataPath, "utf-8"));
        const manual = allManuals.find((m: any) => m.displayName === manualDisplayName);

        if (!manual) throw new Error("Manual no encontrado.");

        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const prompt = `Analiza este manual de la AEAT y genera una Guía de Estudio rápida en Markdown. Incluye: 
        1. Resumen de 3 frases.
        2. Top 5 conceptos clave.
        3. Artículos más importantes para el examen.
        Sé muy conciso y directo para un opositor.`;

        const result = await model.generateContent([
            { fileData: { mimeType: "application/pdf", fileUri: manual.uri } },
            { text: prompt }
        ]);

        return result.response.text();
    } catch (error: any) {
        console.error("Summary Error:", error);
        throw new Error("No se pudo generar el resumen del manual.");
    }
}

export async function generateFlashcards(selectedManualNames: string[] = []) {
    if (!API_KEY) throw new Error("API Key no configurada.");

    try {
        const metadataPath = path.join(process.cwd(), "manuales_metadata.json");
        let manuals = JSON.parse(fs.readFileSync(metadataPath, "utf-8"));
        
        if (selectedManualNames.length > 0) {
            manuals = manuals.filter((m: any) => selectedManualNames.includes(m.displayName));
        }

        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.0-flash",
            generationConfig: { responseMimeType: "application/json" }
        });

        const fileData = manuals.map((m: any) => ({
            fileData: { mimeType: "application/pdf", fileUri: m.uri }
        }));

        const prompt = "Genera 10 flashcards (tarjetas de memoria) para estudiar conceptos clave de la AEAT. La parte delantera debe tener una pregunta corta y la trasera la respuesta exacta basada en la ley. Devuelve un objeto JSON: { \"cards\": [ { \"id\": \"1\", \"front\": \"Pregunta\", \"back\": \"Respuesta\", \"mastered\": false } ] }";

        const result = await model.generateContent([...fileData, prompt]);
        return JSON.parse(result.response.text());
    } catch (error: any) {
        console.error("Flashcard Error:", error);
        throw new Error("No se pudieron generar las flashcards.");
    }
}