
const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

function createWindow() {
  // 브라우저 창 생성
  const win = new BrowserWindow({
    width: 450, // 모바일 뷰와 비슷한 기본 크기
    height: 800,
    minWidth: 375,
    minHeight: 600,
    titleBarStyle: 'hidden', // 타이틀바 숨김 (macOS) 또는 커스텀 가능
    titleBarOverlay: {
      color: '#ffffff', // Windows 컨트롤 버튼 배경색
      symbolColor: '#000000',
      height: 30
    },
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      devTools: true
    },
    icon: path.join(__dirname, 'public/vite.svg'), // 아이콘 경로 (필요시 수정)
    backgroundColor: '#ffffff', // 앱 로딩 전 배경색 (깜빡임 방지)
  });

  // 메뉴바 숨기기 (깔끔한 앱 느낌)
  win.setMenuBarVisibility(false);

  // 개발 모드와 배포 모드 구분
  // 개발 중일 때는 localhost로 접속, 빌드 후에는 index.html 파일 로드
  const startUrl = process.env.ELECTRON_START_URL || `file://${path.join(__dirname, 'dist/index.html')}`;
  
  win.loadURL(startUrl);

  // 외부 링크 클릭 시 기본 브라우저로 열기
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
