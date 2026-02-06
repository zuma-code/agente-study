import { chromium, Page } from 'playwright';
import fs from 'fs/promises';
import path from 'path';

const BRIDGE_DIR = path.join(process.cwd(), '.bridge');
const REQUEST_FILE = path.join(BRIDGE_DIR, 'request.json');
const RESPONSE_FILE = path.join(BRIDGE_DIR, 'response.json');
const USER_DATA_DIR = path.join(process.cwd(), '.notebooklm_session');

// URL of your specific NotebookLM notebook
const NOTEBOOK_URL = 'https://notebooklm.google.com/'; 

async function runBridge() {
    console.log('🚀 Starting Real NotebookLM Bridge...');
    
    // Launch browser with persistent session to keep Google login
    const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
        headless: false, // Set to false to see what's happening or login
        channel: 'chrome',
    });

    const page = await context.newPage();
    await page.goto(NOTEBOOK_URL);

    console.log('📡 Waiting for requests...');

    while (true) {
        try {
            const exists = await fs.stat(REQUEST_FILE).then(() => true).catch(() => false);
            if (exists) {
                const content = await fs.readFile(REQUEST_FILE, 'utf-8');
                const request = JSON.parse(content);
                
                console.log(`📩 Processing request: ${request.query}`);
                
                const answer = await queryNotebookLM(page, request.query);
                
                const response = {
                    requestId: request.id,
                    requestTimestamp: request.timestamp,
                    answer: answer.text,
                    sources: answer.sources,
                    citations: answer.citations,
                    suggestions: answer.suggestions
                };

                await fs.writeFile(RESPONSE_FILE, JSON.stringify(response));
                await fs.unlink(REQUEST_FILE);
                console.log('✅ Response sent to bridge.');
            }
        } catch (error) {
            console.error('❌ Bridge Error:', error);
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
}

async function queryNotebookLM(page: Page, query: string) {
    // 1. Find the input area (Selector might need adjustment based on real NotebookLM UI)
    const inputSelector = 'div[contenteditable="true"], textarea'; 
    await page.waitForSelector(inputSelector);
    await page.fill(inputSelector, query);
    await page.press(inputSelector, 'Enter');

    // 2. Wait for the response to finish generating
    await page.waitForTimeout(3000); // Initial wait
    
    // Wait for the 'stop' button to disappear or the response to finish
    await page.waitForSelector('button[aria-label*="Stop"], .loading-indicator', { state: 'detached', timeout: 60000 }).catch(() => {});

    // 3. Extract text, sources, citations and suggestions
    const result = await page.evaluate(() => {
        const messages = document.querySelectorAll('.chat-message-response, [data-testid="assistant-message"]');
        const lastMessage = messages[messages.length - 1];
        
        // Extract text
        const text = lastMessage?.textContent || 'No se pudo obtener respuesta';
        
        // Extract sources
        const sourceElements = document.querySelectorAll('.source-chip, [data-testid="source-chip"]'); 
        const sources = Array.from(sourceElements).map(el => el.textContent?.trim() || '');

        // Extract Citations
        const citationElements = lastMessage?.querySelectorAll('.citation, [data-citation-index]');
        const citations = Array.from(citationElements).map((el: any) => ({
            index: el.textContent,
            snippet: el.getAttribute('data-snippet') || el.title || '',
            sourceName: el.getAttribute('data-source-name') || ''
        }));

        // Extract Suggestions
        const suggestionElements = document.querySelectorAll('.suggested-query-button, [data-testid="suggested-query"]');
        const suggestions = Array.from(suggestionElements).map(el => el.textContent?.trim() || '').filter(t => t.length > 0);

        return { text, sources, citations, suggestions };
    });

    return result;
}

runBridge().catch(console.error);
