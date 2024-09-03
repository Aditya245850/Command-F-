document.addEventListener('DOMContentLoaded', function() {
        document.getElementById('searchButton').addEventListener('click', () => {
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                        chrome.runtime.sendMessage({ message: 'scrape',APIKEY: document.getElementById('APIKey').value, QUERY: document.getElementById('searchQuery').value});
                });
        });
        document.getElementById('exportButton').addEventListener('click', () => {
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                        chrome.runtime.sendMessage({message: 'export'});
                });
        });
});
chrome.runtime.onMessage.addListener((request) => {
        if (request.message === 'download') {

                const blob = new Blob([request.data], { type: 'text/plain' }); 
                const url = URL.createObjectURL(blob);

                chrome.downloads.download({
                url: url,
                filename: 'scraped_data.txt',
                conflictAction: 'overwrite'
                }, (downloadId) => {
                URL.revokeObjectURL(url);
                });
                chrome.storage.local.remove('Results');
        }
        if (request.type === 'error') {
                document.getElementById('error-message').textContent = `Error: ${request.message}`;
        }
        if (request.message === 'done') {
                document.getElementById('status').textContent = `Done`;
        }
        if (request.type === 'error1') {
                document.getElementById('error-query').textContent = `Error: ${request.message}`;
        }
        if (request.message === 'Processing...') {
                document.getElementById('processing').textContent = `Processing... Please wait, will display "done" when finished.`;
        }
        if (request.message === 'Please scrape some data before attempting to export.') {
                document.getElementById('error-message2').textContent = `Please scrape some data before attempting to export.`;
        }
});


    