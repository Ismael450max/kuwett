/**
 * Quantum Digit Analytics Pipeline Engine
 * Handles binary stream processing via low-latency server links
 */

let wsClient = null;
let ticksHistory = [];
const maxTicksCache = 100; // Sliding historical sample sizing depth
let digitCounts = Array(10).fill(0); // Tracking arrays matching integers 0 through 9

/**
 * Initializes visual chart modules on runtime initialization
 */
function initChartLayout() {
    const container = document.getElementById('histogramContainer');
    if (!container) return;
    
    container.innerHTML = ''; // Sanitize view
    for (let i = 0; i < 10; i++) {
        container.innerHTML += `
            <div class="bar-wrapper">
                <span class="bar-pct" id="pct-${i}">0.0%</span>
                <div class="bar" id="bar-${i}"></div>
                <span class="bar-label">${i}</span>
            </div>`;
    }
}

/**
 * Pushes formatted system metrics into local console interface logs
 */
function writeLog(text, isAlert = false) {
    const consoleEl = document.getElementById('logConsole');
    if (!consoleEl) return;
    
    const timestamp = new Date().toISOString().slice(11, 19);
    const logHtml = `<div class="${isAlert ? 'log-entry' : ''}">[${timestamp}] ${text}</div>`;
    consoleEl.innerHTML = logHtml + consoleEl.innerHTML;
}

/**
 * Acts as primary connection dispatcher based on active socket link states
 */
function togglePipeline() {
    if (wsClient && wsClient.readyState === WebSocket.OPEN) {
        disconnectPipeline();
    } else {
        connectPipeline();
    }
}

/**
 * Connects directly to Deriv Edge Streaming nodes using default testing application tags
 */
function connectPipeline() {
    const asset = document.getElementById('assetSelect').value;
    const btn = document.getElementById('actionBtn');
    
    // Reset data tracking systems
    ticksHistory = [];
    digitCounts.fill(0);
    
    // Connect to public gateway architecture
    wsClient = new WebSocket('wss://://derivws.com');
    writeLog(`Initializing handshake link with Deriv edge servers...`);

    wsClient.onopen = () => {
        writeLog(`Handshake completed. Multiplexing data channel for asset sub-key: ${asset}`);
        wsClient.send(JSON.stringify({ ticks: asset }));
        if (btn) {
            btn.textContent = "Teardown Streaming Link";
            btn.className = "disconnect";
        }
    };

    wsClient.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.tick) {
            processIncomingTick(data.tick);
        }
    };

    wsClient.onerror = (err) => { 
        writeLog(`API Transport Pipeline Fault: Network failure or invalid identifier mapping.`); 
    };
    
    wsClient.onclose = () => { 
        disconnectPipeline(); 
    };
}

/**
 * Tears down sockets safely without dropping active interface frames
 */
function disconnectPipeline() {
    if (wsClient) {
        wsClient.close();
        wsClient = null;
    }
    const btn = document.getElementById('actionBtn');
    if (btn) {
        btn.textContent = "Launch WebSocket Pipeline";
        btn.className = "";
    }
    writeLog(`WebSocket operational loop gracefully torn down.`);
}

/**
 * Strips prices down to exact sub-pip strings to capture floating trailing digits
 */
function processIncomingTick(tick) {
    const rawPriceStr = tick.quote.toFixed(tick.pip_size);
    const lastDigit = parseInt(rawPriceStr.slice(-1));

    document.getElementById('priceDisplay').textContent = rawPriceStr;
    document.getElementById('digitDisplay').textContent = lastDigit;

    // Shift window buffer values
    ticksHistory.push(lastDigit);
    digitCounts[lastDigit]++;

    if (ticksHistory.length > maxTicksCache) {
        const poppedDigit = ticksHistory.shift();
        digitCounts[poppedDigit]--; // Scale density weights backward
    }

    evaluateMetrics();
}

/**
 * Evaluates real-time density models against custom strategic parameters
 */
function evaluateMetrics() {
    const currentSampleTotal = ticksHistory.length;
    if (currentSampleTotal === 0) return;

    const strategy = document.getElementById('strategySelect').value;
    const alertThreshold = parseFloat(document.getElementById('thresholdInput').value);

    for (let i = 0; i < 10; i++) {
        const rawPct = (digitCounts[i] / currentSampleTotal) * 100;
        document.getElementById(`pct-${i}`).textContent = `${rawPct.toFixed(1)}%`;
        
        const bar = document.getElementById(`bar-${i}`);
        bar.style.height = `${Math.min(rawPct * 4, 100)}%`; // Relative scale height metrics

        // Evaluate triggers
        if (strategy === 'matches_differs' && rawPct >= alertThreshold) {
            if (!bar.classList.contains('alert-state')) {
                bar.classList.add('alert-state');
                triggerBackendAlert(i, rawPct.toFixed(1));
            }
        } else {
            bar.classList.remove('alert-state');
        }
    }
}

/**
 * Dispatches structured alert notifications into secure local backend networks
 */
function triggerBackendAlert(digit, percentage) {
    const asset = document.getElementById('assetSelect').value;
    writeLog(`CRITICAL STRATEGY SIGNAL MET: Digit ${digit} surged past threshold boundary at ${percentage}%`, true);
    
    fetch('http://localhost:5000/api/alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            asset: asset,
            digit: digit,
            density: percentage,
            timestamp: new Date().toISOString()
        })
    }).catch(err => {
        // Suppress console alerts if the local Node server is not active
    });
}

// Bootstrap layout components when structural content loads
window.addEventListener('DOMContentLoaded', initChartLayout);
