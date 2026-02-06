# 📜 Bitácora de Desarrollo: Agente AEAT Study App
**Fecha:** 6 de Febrero, 2026
**Estado:** Migración Completa a API Directa (Gemini 2.0 Flash)

## 🎯 Objetivo del Proyecto
Crear un asistente de estudio especializado en las oposiciones de Agente de Hacienda Pública, utilizando NotebookLM como base de conocimiento inicial y evolucionando hacia una solución integrada vía API con Grounding (RAG).

## 🚀 Hitos Técnicos

### 1. Interfaz de Usuario (Next.js 16 + React 19)
- Implementación de **Optimistic UI** para una respuesta instantánea.
- Soporte para **Markdown** enriquecido y renderizado de citas interactivas.
- Sistema de **Auto-scroll** y gestión de errores con botón de reintento.
- Estilizado con **Tailwind CSS 4** utilizando el plugin de tipografía.

### 2. Evolución del Motor (El "Cerebro")
- **Fase 1 (Bridge):** Conexión mediante archivos `.json` y automatización con **Playwright** para interactuar con la web de NotebookLM.
- **Fase 2 (API Directa):** Migración al SDK de Google Generative AI para eliminar la dependencia de navegadores externos.

### 3. Implementación de Grounding (RAG Local)
- Creación de un script de indexación (`index_manuales.ts`) que sube PDFs a la File API de Google.
- Manuales indexados:
    - Constitución Española.
    - Ley General Tributaria (LGT).
    - Reglamento de Gestión e Inspección.
    - Reglamento General de Recaudación.
- Integración en `actions.ts` para que Gemini consulte estos documentos antes de responder.

## 🛠️ Guía de Mantenimiento

### Cómo añadir nuevos temas
1. Colocar los PDFs en la carpeta `manuales_aeat/`.
2. Ejecutar el indexador: `bun index_manuales.ts`.
3. Reiniciar la app: `bun dev`.

### Variables de Entorno
El archivo `.env.local` debe contener:
```env
GEMINI_API_KEY=tu_clave_aqui
```

## 📋 Archivos Clave del Proyecto
- `src/app/actions.ts`: Lógica principal de la API.
- `index_manuales.ts`: Script de subida de documentos.
- `notebook-aeat-manager`: Skill de orquestación para futuros agentes.

---
*Este documento resume la arquitectura construida durante la sesión de entrenamiento.*
