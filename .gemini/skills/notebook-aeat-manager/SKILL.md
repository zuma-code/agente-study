---
name: notebook-aeat-manager
description: Gestión integral del ecosistema de estudio AEAT. Controla los selectores de NotebookLM, protocolos de automatización del bridge y reglas de estudio para la Agencia Tributaria.
---

# Notebook AEAT Manager

Esta skill centraliza el conocimiento técnico y operativo del Agente AEAT con NotebookLM.

## 🎯 Reglas de Estudio AEAT 2026
Al generar o procesar contenido, priorizar:
- **Exactitud Normativa:** Referenciar siempre la LGT (Ley General Tributaria) y reglamentos específicos.
- **Estructura por Bloques:** Bloque 1 (Derecho Administrativo/Constitucional) y Bloque 2 (Gestión Tributaria).
- **Enfoque en Examen:** Priorizar plazos, cuantías y procedimientos administrativos.

## 🛠️ Selectores NotebookLM (Actualizados 2026)
Utilizar estos selectores en `notebooklm_bridge.ts` o herramientas de inspección:
- **Input Chat:** `div[contenteditable="true"]`, `textarea[placeholder*="Escribe"]`
- **Mensaje Asistente:** `.chat-message-response`, `[data-testid="assistant-message"]`
- **Citas:** `.citation`, `[data-citation-index]`
- **Sugerencias:** `.suggested-query-button`, `[data-testid="suggested-query"]`
- **Indicador de Carga:** `button[aria-label*="Stop"]`, `.loading-indicator`

## 🔄 Protocolo de Automatización (Bridge)
1. **Petición:** El frontend escribe en `.bridge/request.json`.
2. **Procesamiento:** `notebooklm_bridge.ts` detecta el archivo -> Navega en Playwright -> Extrae respuesta enriquecida.
3. **Respuesta:** Se escribe en `.bridge/response.json` incluyendo `citations` y `suggestions`.
4. **Limpieza:** Se elimina el archivo de petición para evitar bucles.

## 📂 Recursos de la Skill
- Ver `references/selectors.md` para historial de cambios en la interfaz de Google.
- Ver `references/aeat_syllabus.md` para el mapa completo de los 23 temas.