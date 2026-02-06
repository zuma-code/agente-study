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
                    sources: answer.sources
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
    // We look for the last message and wait for the "typing" or "loading" indicators to disappear
    await page.waitForTimeout(3000); // Initial wait for generation to start
    
    // This is a heuristic: wait until the 'stop' button or similar indicator is gone
    // Or wait until the last message text stops changing.
    await page.waitForSelector('.chat-message-response', { state: 'visible' });

    // 3. Extract text and sources
    const result = await page.evaluate(() => {
        const messages = document.querySelectorAll('.chat-message-response');
        const lastMessage = messages[messages.length - 1];
        
        // Extract text
        const text = lastMessage?.textContent || 'No se pudo obtener respuesta';
        
        // Extract sources (if they exist as chip/buttons)
        const sourceElements = document.querySelectorAll('.source-chip'); 
        const sources = Array.from(sourceElements).map(el => el.textContent?.trim() || '');

        return { text, sources };
    });

    return result;
}

runBridge().catch(console.error);
