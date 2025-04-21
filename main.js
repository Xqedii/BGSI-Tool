const { app, BrowserWindow, ipcMain, globalShortcut } = require('electron');
const https = require('https');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
const universeID = '6504986360'
const puppeteer = require('puppeteer');
const URL = 'https://bgs-infinity.fandom.com/wiki/Eggs#Overworld';
let currentProgress = 0;
let previousLikes = 0;
let lastRewardThreshold = 0;
const clientId = '1362277319288426587';
const options = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  },
};

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1350,
    height: 725,
    icon: path.join(__dirname, 'icons/logo.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  mainWindow.setMinimumSize(960, 625);

  mainWindow.loadFile('index.html');
  mainWindow.setMenu(null);
  mainWindow.setIcon(path.join(__dirname, 'icons/logo.png'));
  mainWindow.on('closed', () => {
    mainWindow = null;
});
}

const formatNumberWithSpaces = (number) => {
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

function MysteryBoxBar(progress = 0) {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  const clampedProgress = Math.max(0, Math.min(progress, 200));
  
  const percent = (clampedProgress / 200) * 100;

  if (currentProgress !== clampedProgress) {
    mainWindow.webContents.executeJavaScript(`
      try {
        const progressBar = document.getElementById('progress-bar');
        if (!progressBar) throw new Error('Progress bar not found');

        progressBar.style.transition = 'width 0s linear';
        progressBar.style.width = '${(currentProgress / 200) * 100}%';

        setTimeout(() => {
          progressBar.style.transition = 'width 1.5s ease-in-out';
          progressBar.style.width = '${percent}%';
        }, 50);
      } catch (err) {}
    `).catch((err) => {});
    
    currentProgress = clampedProgress;
  }
}


function addCustomRow(status, label, statusColor, duration = 800) {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  setTimeout(() => {
    mainWindow.webContents.executeJavaScript(`
      try {
        const tbody = document.getElementById('last-stats');
        if (!tbody) throw new Error('tbody for last-stats not found');
        
        const newRow = document.createElement('tr');
        newRow.className = 'h-12';
        newRow.innerHTML = \`
          <td>${status}</td>
          <td>${label}</td>
          <td>
            <div class="status-bar-container">
              <div class="status-bar" style="background-color: ${statusColor};"></div>
            </div>
          </td>
        \`;
        
        const statusBar = newRow.querySelector('.status-bar');

        statusBar.style.transitionDuration = '${duration}ms';
        
        setTimeout(() => {
          statusBar.style.width = '100%';
        }, 20);

        tbody.insertBefore(newRow, tbody.firstChild);
      } catch (err) {}
    `).catch((err) => {});
  }, 100);
}


async function getLikesCount() {
  const url = `https://www.roblox.com/games/85896571713843`;

  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle2' });

    await page.waitForSelector('#vote-up-text', { timeout: 3000 });

    const likes = await page.$eval('#vote-up-text', el => el.getAttribute('title'));

    await browser.close();
    return likes || '0';

  } catch (err) {
    await browser.close();
    return '0';
  }
}

function calculateMissingLikes() {
  getLikesCount().then((value) => {
    const currentLikes = value;

    const currentThreshold = Math.floor(currentLikes / 200) * 200;
    const nextMultipleOf200 = currentThreshold + 200;
    const missingLikes = nextMultipleOf200 - currentLikes;

    MysteryBoxBar(200 - missingLikes);

    const likesDisplay = formatNumberWithSpaces(currentLikes);
    mainWindow.webContents.executeJavaScript(`
      document.getElementById('counter').innerText = '${200 - missingLikes}/200';
      document.getElementById('game-likes').innerText = '${likesDisplay}';
    `);

    if (currentThreshold > lastRewardThreshold) {
      addCustomRow('Success', 'Mystery Box Received', '#ff6bff', 5000);
      lastRewardThreshold = currentThreshold;
    }

    if (currentLikes > previousLikes) {
      previousLikes = currentLikes;
    }

  }).catch((error) => {});
}


async function getRobloxGameTitle(universeID) {
  const url = `https://games.roblox.com/v1/games?universeIds=${universeID}`;

  try {
    const response = await axios.get(url);
    const gameData = response.data.data[0];

    const title = gameData.name;
    const author = gameData.creator.name;
    const onlinePlayers = formatNumberWithSpaces(gameData.playing);
    const description = gameData.description;
    
    const desc1 = description.split('\n')[0];
    const desc2 = description.split('\n').slice(1).join('\n');
    mainWindow.webContents.executeJavaScript(`
      document.getElementById('game-title').innerText = ${JSON.stringify(title)};
      document.getElementById('game-title2').innerText = ${JSON.stringify(title)};
      document.getElementById('game-author').innerText = ${JSON.stringify(author)};
      document.getElementById('game-online').innerText = ${JSON.stringify(onlinePlayers)};
      document.getElementById('game-desc1').innerText = ${JSON.stringify(desc1)};
      document.getElementById('game-desc2').innerText = ${JSON.stringify(desc2)};
    `);
    

    addCustomRow('Success', 'Game Info', '#ffff21', 1500);
    calculateMissingLikes();
    setInterval(calculateMissingLikes, 10000);
  } catch (error) {
    console.error(error);
    addCustomRow('Failed', 'Game Info', '#ff4a4a', 1500);
  }
}
app.whenReady().then(() => {
    createWindow();
 
    addCustomRow('Success', 'Loaded', '#4ade80', 500);
    mainWindow.webContents.executeJavaScript(`
        document.body.style.userSelect = 'none';
    `);

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
    getRobloxGameTitle(universeID);
    mainWindow.webContents.executeJavaScript(`
      const el = document.getElementById('loadCSS');
      if (el) {
        el.style.display = 'none';
      }
    `);
});




// Fast Hatch
const mouseEvents = require('global-mouse-events');
const childProcess = require('child_process');
const spawn = childProcess.spawn;

const pythonScriptPath = path.join(process.cwd(), 'fasthatch.py');
let currentProcess = null;
let isRunning = false;

ipcMain.on('toggle-fasthatch-script', (event, args) => {  
  if (isRunning && currentProcess) {
    try {
      currentProcess.kill();
    } catch (e) {}
    currentProcess = null;
    isRunning = false;
    addCustomRow('Stopped', 'Fast Hatch', '#209bff', 500);
    
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('fasthatch-status-changed', { isRunning: false });
    }
    
    return;
  }
  const speed = args.speed || 10;
  
  try {
    console.log('PATH to python script:', pythonScriptPath);
    currentProcess = spawn('python', [pythonScriptPath, speed.toString()]);
    currentProcess.stdout.on('data', (data) => {
      console.log(`PYTHON STDOUT: ${data}`);
    });
    
    currentProcess.stderr.on('data', (data) => {
      console.error(`PYTHON STDERR: ${data}`);
    });
    isRunning = true;
    addCustomRow('Started', 'Fast Hatch', '#209bff', 500);

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('fasthatch-status-changed', { isRunning: true });
    }
    currentProcess.on('close', (code) => {
      currentProcess = null;
      isRunning = false;
      
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('fasthatch-status-changed', { isRunning: false });
      }
    });
    
    currentProcess.on('error', (err) => {
      currentProcess = null;
      isRunning = false;
      
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('fasthatch-status-changed', { isRunning: false });
      }
    });
  } catch (error) {
    isRunning = false;
  }
});

let registeredShortcut = null;

ipcMain.on('register-fasthatch-keybind', (event, keybind) => {
  if (registeredShortcut) {
    try {
      globalShortcut.unregister(registeredShortcut);
    } catch (e) {}
  }
  if (keybind === 'Mouse 4' || keybind === 'Mouse 5') {
    registeredShortcut = keybind;
    return;
  }

  const electronKeybind = keybind
    .replace('Control', 'CommandOrControl')
    .replace('Scroll Click', 'ScrollLock')
    .split('+')
    .filter(key => !key.includes('Mouse') && !key.includes('Scroll Click'))
    .join('+');

  if (!electronKeybind || electronKeybind === '') {
    registeredShortcut = null;
    return;
  }

  try {
    const registered = globalShortcut.register(electronKeybind, () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('fasthatch-keybind-triggered');
      }
    });

    if (registered) {
      registeredShortcut = electronKeybind;
    } else {
      registeredShortcut = null;
    }
  } catch (error) {
    registeredShortcut = null;
  }
});


app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (currentProcess) {
    try {
      currentProcess.kill();
    } catch (e) {}
  }
});

mouseEvents.on('mousedown', (event) => {
  const isMouse4 = event.button === 4;
  const isMouse5 = event.button === 5;

  if (registeredShortcut === 'Mouse 4' && isMouse4) {
    mainWindow?.webContents.send('fasthatch-keybind-triggered');
  } else if (registeredShortcut === 'Mouse 5' && isMouse5) {
    mainWindow?.webContents.send('fasthatch-keybind-triggered');
  }
});