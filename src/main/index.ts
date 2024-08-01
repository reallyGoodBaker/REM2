import { app, shell, BrowserWindow, ipcMain, screen } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { systemDb } from './database'

function initWinSize() {
    const { promise, resolve, reject } = Promise.withResolvers<{width: number, height: number}>()
    const { width, height } = screen.getPrimaryDisplay().bounds

    systemDb.findOne({
        key: 'system.size'
    }, (err, doc) => {
        if (err) {
            return reject(err)
        }

        if (!doc) {
            systemDb.insert(doc = {
                key: 'system.size',
                value: {
                    width: Math.floor(width * 0.8),
                    height: Math.floor(height * 0.8)
                }
            })
        }

        resolve(doc.value)
    })

    return promise
}

async function createWindow() {
    const { width, height } = await initWinSize()
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width,
        height,
        show: false,
        autoHideMenuBar: true,
        roundedCorners: true,
        frame: false,
        ...(process.platform === 'linux' ? { icon } : {}),
        webPreferences: {
            preload: join(__dirname, '../preload/index.js'),
            sandbox: false
        }
    })

    mainWindow.on('ready-to-show', () => {
        mainWindow.show()
    })

    mainWindow.webContents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url)
        return { action: 'deny' }
    })

    // HMR for renderer base on electron-vite cli.
    // Load the remote URL for development or the local html file for production.
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
        mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }

    onWindowInit(mainWindow)
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
    // Set app user model id for windows
    electronApp.setAppUserModelId('com.electron')

    // Default open or close DevTools by F12 in development
    // and ignore CommandOrControl + R in production.
    // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
    app.on('browser-window-created', (_, window) => {
        optimizer.watchWindowShortcuts(window)
    })

    // IPC test
    ipcMain.on('ping', () => console.log('pong'))

    createWindow()

    app.on('activate', function () {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
function onWindowInit(win: BrowserWindow) {
    win.on('resize', () => {
        const { width, height } = win.getBounds()

        systemDb.update({
            key: 'system.size'
        }, {
            $set: {
                value: {
                    width, height
                }
            }
        })
    })
}