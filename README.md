# 口袋收藏 · GitHub Pages 版

收集 IG／Facebook 連結、美食介紹、景點、圖片與影片，整理成可搜尋的私人收藏。這是 **React + Vite 的純靜態專案**，不依賴 Sites、Cloudflare、伺服器或登入服務。

## 部署到 GitHub Pages

1. 在 GitHub 建立儲存庫，例如 `pocket-places`，使用 `main` 分支。
2. 將本資料夾的**內容**推到儲存庫根目錄，包含 `.github/workflows/deploy.yml`。
3. 到儲存庫 **Settings → Pages → Build and deployment → Source** 選 **GitHub Actions**。
4. 到 **Actions** 查看 `Deploy GitHub Pages`。成功後到 Pages 頁面取得網站網址。

不需要設定 API Key 或 repository secrets。建置使用相對路徑，可部署到 `https://你的帳號.github.io/儲存庫名稱/`，也支援帳號首頁與自訂網域。

若從 GitHub 網頁上傳時沒有包含隱藏的 `.github` 資料夾，可手動建立 `.github/workflows/deploy.yml`，貼上專案內同名檔案。不要上傳 `node_modules`。

### 不使用 Actions，直接上傳成品

壓縮檔中的 `ready-to-upload/` 已包含建置完成的網站。把該資料夾**裡面的檔案**全部放到儲存庫根目錄（包含 `.nojekyll`），在 Pages 選 **Deploy from a branch → main → /(root)** 即可。不需要自己安裝 Node.js。不要再把原始碼的 index.html 覆蓋上去；要使用 ready-to-upload 內的版本。

日後修改程式時建議採用上方 Actions 方式，由 GitHub 自動重新建置。

## 本機執行

需要 Node.js 22.13 以上，建議 Node.js 24。

```bash
npm ci
npm run dev
```

依終端顯示的網址開啟，不要直接雙擊 index.html。

```bash
npm test
npm run build
npm run preview
```

## 現有功能

- 加入連結、貼文文字、圖片或影片，每個附件上限 25 MB，每張收藏最多 8 個。
- 在新增視窗貼上剪貼簿截圖。
- 在裝置上辨識繁體中文／英文圖片文字；影片取樣 4 個畫面做文字辨識。
- 從文字依規則擷取分類、地區、地址、明確標示的均消與關鍵字。結果需人工確認。
- 搜尋、分類、地區和來源篩選、想去／去過／最愛、編輯與合併收藏。
- 原始連結防重複、保留多個推薦來源、Google Maps 搜尋連結。
- IndexedDB 儲存紀錄和原始附件。
- 完整 JSON 備份包含附件，可在另一台裝置匯入。匯入新增資料，重複來源會略過，不會覆蓋既有收藏。
- 可加入手機主畫面；首次載入後有基本離線快取。OCR 資料首次使用需要連線載入，已快取後可離線辨識。
- 範例卡片僅供預覽，不會寫入收藏。

## 先了解這些限制

**資料存在各裝置、各瀏覽器，不會自動跨裝置同步。** 使用完整備份匯出／匯入搬移資料。清除網站資料、無痕模式結束或裝置空間不足可能使資料消失；請定期備份。換網址、換儲存庫路徑前也請先備份。

純 GitHub Pages 沒有伺服器代理，本版**不自動抓取 IG／FB 連結內的影片或貼文**。連結可以保存；要整理內容，請補貼文文字、截圖，或上傳可取得的影片檔。不會自動讀取你在 IG／FB 帳號內的既有收藏。

本版沒有影片語音轉錄或大型語言模型。OCR 是讀文字，不是完整理解影片；影片取樣可能漏掉字幕。HEIC 和部分 MOV 的辨識取決於瀏覽器解碼支援，失敗時改用 JPG 或 MP4。

GitHub Pages 網址的程式本身可以公開查看，但本版不把你的收藏上傳到 GitHub。任何人開同網址，看到的都是他自己瀏覽器內的資料。

手機分享選單的接收能力依系統與瀏覽器而異；iPhone 的可靠方式是複製連結後貼到工具。Safari 可用「分享 → 加入主畫面」。

若日後要跨裝置自動同步、影片語音轉錄或 AI 理解，可在此專案另接儲存與辨識服務；不要把秘密 API Key 寫入 GitHub Pages 前端。

## 檔案結構

- `src/Inbox.tsx`：操作介面。
- `src/lib/local-store.ts`：IndexedDB 與完整備份。
- `src/lib/organize.ts`：文字擷取與資料正規化。
- `src/lib/ocr.ts`：圖片／影片畫面文字辨識。
- `public/ocr/`：隨專案提供的辨識程式與語言模型。
- `.github/workflows/deploy.yml`：GitHub Pages 部署。
- `ready-to-upload/`：本次已建置網站；日後用 `npm run build` 取得新的 `dist/`。

第三方 OCR 授權與來源見 `public/ocr/THIRD_PARTY_NOTICES.md`。
