const { app, BrowserWindow, Menu, globalShortcut, ipcMain, shell } = require('electron')
const imagemin = require('imagemin')
const imageminMozjpeg = require('imagemin-mozjpeg')
const imageminPngquant = require('imagemin-pngquant')
const slash = require('slash')
const path = require('path');
const os = require('os')
const log = require('electron-log')


process.env.NODE_ENV = 'production'

const isDev = process.env.NODE_ENV !== 'production'
const isMac = process.platform === 'darwin'

console.log(process.platform)

let mainWindow
let aboutWindow
const CMD_CTRL = 'CmdOrCtrl+'
const QUIT_APP_SHORT_CUT = CMD_CTRL + 'W'
const RELOAD_APP = CMD_CTRL + 'R'
const TOGGLE_DEV_TOOLS = isMac ? 'Command+Alt+I' : 'Ctrl+Shift+I'

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: isDev ? 700 : 500,
    height: 600,
    title: 'Время сжимать фоточки',
    icon: `${__dirname}/assets/icons/Icon_256x256.png`,
    resizable: isDev,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })
  if (isDev) {
    mainWindow.webContents.openDevTools()
  }


  mainWindow.loadFile('./app/index.html')
}

function createAboutWindow() {
  aboutWindow = new BrowserWindow({
    width: 300,
    height: 300,
    title: 'О приложении',
    icon: `${__dirname}/assets/icons/Icon_256x256.png`,
    resizable: false,
    backgroundColor: 'blue'
  })
  aboutWindow.loadFile('./app/about.html')
  aboutWindow.removeMenu();
}

const menu = [

  {
    label: 'Меню',
    submenu: [{
      label: 'Выход',
      accelerator: QUIT_APP_SHORT_CUT,
      click: () => app.quit()
    },]
  },
  (isMac ? {
    label: app.name,
    submenu: [{
      label: 'About',
      click: createAboutWindow,
    }]
  } : {
    label: 'Инфо',
    submenu: [{
      label: 'О приложении',
      click: createAboutWindow,
    }]
  }),
  ...(isDev ? [{
    label: 'Developer',
    submenu: [
      { role: 'reload' },
      { role: 'forcereload' },
      { type: 'separator' },
      { role: 'toggledevtools' },

    ]
  }] : [])

]


ipcMain.on('image:minimize', (e, options) => {
  options.destination = path.join(os.homedir(), 'imageShrink')
  shrinkImage(options)

})

async function shrinkImage({ imgPath, quality, destination }) {
  try {
    const pngQuality = quality / 100
    const files = await imagemin([slash(imgPath)], {
      destination,
      plugins: [
        imageminMozjpeg({
          quality
        }),
        imageminPngquant({
          quality: [pngQuality, pngQuality]
        })
      ]
    });

    await shell.openPath(destination)
    mainWindow.webContents.send('image:done')
    log.info(files)
  } catch (e) {
    log.error(e)
  }
}


app.whenReady().then(() => {
  createMainWindow()
  const mainMenu = Menu.buildFromTemplate(menu)
  Menu.setApplicationMenu(mainMenu)

  globalShortcut.register(RELOAD_APP, () => mainWindow.reload())
  globalShortcut.register(TOGGLE_DEV_TOOLS, () => mainWindow.toggleDevTools())

  mainWindow.on('closed', () => mainWindow = null)


  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})


app.on('window-all-closed', () => {
  if (!isMac) app.quit()

})
