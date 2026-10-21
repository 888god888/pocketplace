# 口袋收藏 · GitHub Pages 版

收集 IG／Facebook 連結、美食介紹、景點、圖片與影片，整理成可搜尋的私人收藏。這是 **React + Vite 靜態前端**。可選擇連接自己的 Supabase Edge Function 讀取公開 IG 貼文介紹，不需 Cloudflare 或登入服務。

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
- 設定自己的 Supabase 函式後，可讀取公開 IG 貼文介紹，將多家店分開勾選、修改與收藏。
- 搜尋、分類、地區和來源篩選、想去／去過／最愛、編輯與合併收藏。
- 原始連結防重複、保留多個推薦來源、Google Maps 搜尋連結。
- IndexedDB 儲存紀錄和原始附件。
- 完整 JSON 備份包含附件，可在另一台裝置匯入。匯入新增資料，重複來源會略過，不會覆蓋既有收藏。
- 可加入手機主畫面；首次載入後有基本離線快取。OCR 資料首次使用需要連線載入，已快取後可離線辨識。
- 範例卡片僅供預覽，不會寫入收藏。

## 先了解這些限制

**資料存在各裝置、各瀏覽器，不會自動跨裝置同步。** 使用完整備份匯出／匯入搬移資料。清除網站資料、無痕模式結束或裝置空間不足可能使資料消失；請定期備份。換網址、換儲存庫路徑前也請先備份。

未設定 IG 連線時，連結只保存來源。連接自己的 Supabase 函式後，可讀取公開 IG 貼文介紹；IG 可能要求登入或限制存取，此時保留連結並顯示失敗原因，可手動補文字或截圖。本版不下載 IG／FB 影片，也不會自動讀取你在平台內的既有收藏。

本版沒有影片語音轉錄或大型語言模型。OCR 是讀文字，不是完整理解影片；影片取樣可能漏掉字幕。HEIC 和部分 MOV 的辨識取決於瀏覽器解碼支援，失敗時改用 JPG 或 MP4。

GitHub Pages 網址的程式本身可以公開查看，但本版不把你的收藏上傳到 GitHub。任何人開同網址，看到的都是他自己瀏覽器內的資料。

手機分享選單的接收能力依系統與瀏覽器而異；iPhone 的可靠方式是複製連結後貼到工具。Safari 可用「分享 → 加入主畫面」。

若日後要跨裝置自動同步、影片語音轉錄或 AI 理解，可在此專案另接儲存與辨識服務；不要把秘密 API Key 寫入 GitHub Pages 前端。

## 檔案結構

- `src/Inbox.tsx`：操作介面。
- `src/ConnectionSettings.tsx`、`src/lib/remote.ts`：IG 連線設定與請求。
- `src/PlaceCandidates.tsx`：多家店確認清單。
- `supabase/functions/ig-collect/index.ts`：已驗證中文標題格式的後端原始碼；需另外部署到 Supabase。
- `src/lib/local-store.ts`：IndexedDB 與完整備份。
- `src/lib/organize.ts`：文字擷取與資料正規化。
- `src/lib/ocr.ts`：圖片／影片畫面文字辨識。
- `public/ocr/`：隨專案提供的辨識程式與語言模型。
- `.github/workflows/deploy.yml`：GitHub Pages 部署。
- `ready-to-upload/`：本次已建置網站；日後用 `npm run build` 取得新的 `dist/`。

第三方 OCR 授權與來源見 `public/ocr/THIRD_PARTY_NOTICES.md`。

## 連接 Supabase

1. 使用 Supabase 網頁編輯器部署 `supabase/functions/ig-collect/index.ts`，函式名 `ig-collect`。
2. 在 Edge Functions → Secrets 設定 `POCKET_ACCESS_TOKEN`（至少 24 字元的隨機密碼），以及 `ALLOWED_ORIGINS`（網站 origin，例如 `https://888god888.github.io`；不包含 `/pocketplace/`）。本機開發可另加 `http://127.0.0.1:5173`，多個來源以逗號分隔。
3. 僅為 `ig-collect` 關閉內建 JWT 驗證，函式自行檢查 `x-pocket-token`。程式碼與 GitHub 不包含真實密碼。
4. 在網站左側「IG 連線設定」貼上 Function URL 與密碼，按「儲存並測試」。服務網址保存在此瀏覽器，密碼保存在分頁工作階段，不進入收藏備份。
5. 新增 IG 連結後按「讀取連結並自動整理」，多家店可逐一勾選、修正，最後一次收藏。

同一批收藏共用來源與附件；保留批次識別，讓多店清單在備份與匯入時不會被誤判為同一張卡片。單筆既有收藏的來源防重複規則保持適用。IG 介紹未提供的地址與價格留白，語音與雲端同步尚未提供。

## Google 地圖搜尋與分享連結

- 收藏卡片、收藏詳情、多店確認清單提供「Google 地圖搜尋」「複製店名＋地區」「複製地址」。沒有地址時，搜尋使用店名與地區，複製地址按鈕會停用。
- 搜尋使用 Google Maps URLs，不需 Google API Key 或 AI Key。搜尋連結不代表已驗證是同一家分店。
- 卡片可填寫「Google 地圖分享連結」；從地圖按「分享 → 複製連結」，貼上後儲存。多店清單需展開個別店家的「查看／修改資訊」填寫，每家店各自保留連結。
- 直接把 Google 地圖連結貼到首頁，也能建立新收藏；店名與地址可手動補充。本版不自動下載 Google 評分、營業時間或其他商家資料。
- 分享連結隨完整備份保存，Google 地圖來源可單獨篩選。舊收藏與 IndexedDB 資料庫名稱保持相容。
- 若瀏覽器不允許自動複製，畫面會提供文字框，可全選或長按複製。

官方連結格式：https://developers.google.com/maps/documentation/urls/get-started
