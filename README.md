# 🤖 Agente AEAT - Study Hub (NotebookLM Edition)

Una aplicación de estudio avanzada diseñada para opositores de la **Agencia Estatal de Administración Tributaria (AEAT)**, potenciada por inteligencia artificial real mediante Google NotebookLM.

## 🌟 Experiencia de Usuario

Esta plataforma transforma el temario oficial en un tutor personal interactivo.

- **Chat Inteligente**: Resuelve dudas en tiempo real sobre los bloques de **Derecho Común** y **Gestión de Recaudación**.
- **Dashboard de Progreso**: Visualiza los temas ingeridos y procesados por la IA.
- **Sugerencias de Estudio**: El sistema propone temas clave basados en el análisis del temario oficial.
- **Interfaz Premium**: Diseño inspirado en terminales de alta fidelidad con efectos de glassmorphism y animaciones fluidas para una concentración máxima.

## 🛠️ Stack Tecnológico

La aplicación utiliza tecnologías de vanguardia para garantizar seguridad y velocidad.

- **Frontend**: [Next.js 16](https://nextjs.org/) con App Router y React 19.
- **Estilos**: Sistema de diseño basado en **CSS moderno**, utilizando variables y filtros de desenfoque (`backdrop-filter`) para una estética "Glass".
- **Lógica de Servidor**: [React Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations) para manejar la comunicación asíncrona de forma segura.
- **IA**: Integración con **Google NotebookLM** a través de **MCP (Model Context Protocol)**.

### 🛰️ Live MCP Bridge (Arquitectura Exclusiva)

Debido a la naturaleza del entorno de desarrollo, la aplicación implementa un protocolo de comunicación personalizado llamado **Live MCP Bridge (V2)**:

1. **Protocolo basado en Archivos**: El servidor de Next.js escribe peticiones en un directorio `.bridge`.
2. **Sincronización por Timestamps**: Utiliza marcas de tiempo para asegurar que las respuestas lleguen al hilo de ejecución correcto, eliminando latencias por desincronización.
3. **Resiliencia**: Polling robusto de 120 segundos que permite a la IA sintetizar respuestas complejas desde manuales extensos sin perder la conexión.
4. **Watcher Script**: Incluye un script de monitoreo (`bridge_watcher.sh`) que acelera la detección de peticiones.

## 🚀 Instalación y Uso

1. **Instalar dependencias**:
   ```bash
   bun install
   ```
2. **Iniciar el servidor de desarrollo**:
   ```bash
   bun run dev
   ```
3. **Iniciar el Bridge Watcher** (para datos reales):
   ```bash
   ./bridge_watcher.sh
   ```

---
*Desarrollado con ❤️ para la eficiencia en el estudio de leyes y tributación.*
