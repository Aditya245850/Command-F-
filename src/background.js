let rawHTMLContent = '';
let API_key = '';
const maxChunkSize = 30000; 
const data = [];
chrome.storage.local.set({Results: data});
function scrapeContent() {
    return document.documentElement.innerHTML;
}
function getCurrentTabId(callback) {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        const tabId = tabs[0].id;
        callback(tabId);
    });
}
function splitHTML(html, maxChunkSize) {
    chrome.runtime.sendMessage({message: 'Processing...'});
    const chunks = [];
    let start = 0;
    let end = maxChunkSize - 1;
    while (start < html.length) {
        chunks.push(html.slice(start, end));
        start = end + 1;
        end = start + maxChunkSize - 1;
    }
    
    return chunks;
}
async function processChunks(query, chunks) {
    var result = '';
    var prev = '';
    for (const chunk of chunks) {
        await new Promise((resolve) => {
            setTimeout(async () => {
                try {
                    result = await getOpenAIResponse(query, prev, chunk);
                    prev = result;
                    resolve();  
                } catch (error) {
                    resolve(); 
                }
            }, 100);  
        });
    }
    return result; 
}
    async function getOpenAIResponse(query, prev, chunk) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_key}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',  
                messages: [
                    {
                        role: 'user',
                        content: `Go through the provided text and this text, ${prev}, and extract all information related to the word ${query}.
                        If the text contains synonyms or closely related concepts instead of the exact word ${query} include that information as well. 
                        What does the text say about ${query}?
                        For example, if the word is 'dog nutrition' and the text only mentions 'dog food,' 
                        include the information about 'dog food' as it is closely related to 'dog nutrition:\n\n${chunk}`
                    }
                ],
                max_tokens: 500
            })
        });
        const data = await response.json();
        return data.choices[0].message.content; 
}

async function storeResults(airesponse) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(["Results"], result => {
            let data = result.Results || []; 
            data.push(airesponse);
            chrome.storage.local.set({Results: data},  () => {
                resolve();
            });
        });
    });
};

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.message === 'scrape') {
            API_key = request.APIKEY;
            if (request.QUERY == '') {
                chrome.runtime.sendMessage({ type: 'error1', message: 'Enter Query!' });
            }
            else {
                if (API_key != '') {
                    getCurrentTabId((tabID) => {
                        chrome.scripting.executeScript({
                            target: {tabId: tabID},
                            func: scrapeContent
                        })
                        .then(async results => {
                            if (results && results[0] && results[0].result) {
                                rawHTMLContent = results[0].result;
                                const htmlChunks = splitHTML(rawHTMLContent, maxChunkSize);
                                const finalResult = await processChunks(request.QUERY, htmlChunks);
                                await storeResults(finalResult);
                                chrome.runtime.sendMessage({message: 'done'});
                            }
                        });
                    });  
                }
                else {
                    chrome.runtime.sendMessage({ type: 'error', message: 'Enter API Key!' });
                }
            }
        }
  });
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.message === 'export') {
        chrome.storage.local.get(["Results"], result => {
            var finalData = '';
            if (result.Results.length == 0) {
                chrome.runtime.sendMessage({message: 'Please scrape some data before attempting to export.'});
            }
            else {
                for (var i = 0; i < result.Results.length; i++) {
                    finalData += '----------------------------------------------------------------------------\n'
                    finalData += result.Results[i];
                    finalData += '\n----------------------------------------------------------------------------'
                }
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    chrome.runtime.sendMessage({message: 'download', data: finalData});
                });
            }
        });
    }
});
