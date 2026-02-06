import { GoogleAIFileManager, FileState } from "@google/generative-ai/server";
import fs from "fs";
import path from "path";

// Cargar API KEY de .env.local de forma manual para el script
const envLocal = fs.readFileSync(".env.local", "utf-8");
const apiKeyMatch = envLocal.match(/GEMINI_API_KEY=(.*)/);
const apiKey = apiKeyMatch ? apiKeyMatch[1].trim() : process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("Error: GEMINI_API_KEY no encontrada.");
  process.exit(1);
}

const fileManager = new GoogleAIFileManager(apiKey);
const MANUALS_DIR = path.join(process.cwd(), "manuales_aeat");
const METADATA_FILE = path.join(process.cwd(), "manuales_metadata.json");

async function indexManuals() {
  if (!fs.existsSync(MANUALS_DIR)) {
    console.error("La carpeta manuales_aeat no existe.");
    return;
  }

  const files = fs.readdirSync(MANUALS_DIR).filter(f => f.endsWith(".pdf"));
  console.log(`Encontrados ${files.length} manuales. Iniciando subida...`);

  const indexedFiles = [];

  for (const fileName of files) {
    const filePath = path.join(MANUALS_DIR, fileName);
    console.log(`Subiendo: ${fileName}...`);

    try {
      const uploadResult = await fileManager.uploadFile(filePath, {
        mimeType: "application/pdf",
        displayName: fileName,
      });

      let file = await fileManager.getFile(uploadResult.file.name);
      while (file.state === FileState.PROCESSING) {
        process.stdout.write(".");
        await new Promise((resolve) => setTimeout(resolve, 2000));
        file = await fileManager.getFile(uploadResult.file.name);
      }

      if (file.state === FileState.FAILED) {
        throw new Error("Procesamiento fallido.");
      }

      console.log(`\nIndexado: ${fileName}`);
      indexedFiles.push({
        name: file.name,
        displayName: file.displayName,
        uri: file.uri
      });
    } catch (error) {
      console.error(`\nError subiendo ${fileName}:`, error);
    }
  }

  fs.writeFileSync(METADATA_FILE, JSON.stringify(indexedFiles, null, 2));
  console.log("\nIndexacion completada. Metadatos guardados en manuales_metadata.json");
}

indexManuals().catch(console.error);