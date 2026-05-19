/**
 * 大六壬 V7.x 功能补全补丁：导入/导出/云端同步
 * 
 * 补全原 V6.2 中仅有 UI 壳的三个功能：
 *   1. 导入本地 .json 文件（文件选择器 + FileReader）
 *   2. 导出本地 .json 文件（Blob 下载）
 *   3. 云端同步（Upstash Redis 推拉）
 * 
 * 用法：部署到网站根目录，在 index.html 的 </body> 前加一行：
 *   <script src="./liuren_io_patch.js"></script>
 */

(function() {

    // ==========================================
    // 等待页面初始化完成
    // ==========================================
    function waitReady() {
        return new Promise(resolve => {
            const check = setInterval(() => {
                if (window.STATE && window.BIZ && window.UI) {
                    clearInterval(check);
                    resolve();
                }
            }, 200);
            setTimeout(() => { clearInterval(check); resolve(); }, 10000);
        });
    }

    // ==========================================
    // 获取配置（含 Upstash 云端配置）
    // ==========================================
    function getCloudConfig() {
        const keyEl = document.getElementById('cfg_binKey');
        const idEl  = document.getElementById('cfg_binId');
        let savedCfg = JSON.parse(localStorage.getItem('lr_config') || '{}');
        let binKey = keyEl ? keyEl.value : '';
        let binId  = idEl  ? idEl.value  : '';
        if (!binKey && savedCfg.binKey) binKey = savedCfg.binKey;
        if (!binId  && savedCfg.binId)  binId  = savedCfg.binId;
        return { key: binKey, url: binId };
    }

    /**
     * 安全提示（兼容 UI.toast 不存在的情况）
     */
    function safeToast(msg, isError) {
        try {
            if (window.UI && typeof window.UI.toast === 'function') {
                window.UI.toast(msg, isError);
            } else if (window.UI && typeof window.UI.showMsg === 'function') {
                window.UI.showMsg(msg, isError);
            } else {
                console.log('[IO补丁]', msg);
            }
        } catch(e) {
            console.log('[IO补丁]', msg);
        }
    }
    // ==========================================
    function initLocalImport() {
        const inputEl = document.getElementById('file_importLocal');
        const btnEl    = document.getElementById('btn_importLocal');
        if (!inputEl || !btnEl) {
            console.warn('[IO补丁] 找不到导入按钮或文件选择器');
            return;
        }

        // 点击按钮 → 触发文件选择
        btnEl.addEventListener('click', () => {
            inputEl.click();
        });

        // 选择文件后 → 读取并解析
        inputEl.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const data = JSON.parse(evt.target.result);
                    let records = [];

                    // 兼容多种 JSON 格式
                    if (Array.isArray(data)) {
                        records = data;                           // [{...}, {...}]
                    } else if (data.history && Array.isArray(data.history)) {
                        records = data.history;                   // {history: [...]}
                    } else if (data.records && Array.isArray(data.records)) {
                        records = data.records;                   // {records: [...]}
                    } else if (typeof data === 'object') {
                        records = [data];                         // 单个
                    }

                    if (records.length === 0) {
                        throw new Error('文件中没有找到有效记录');
                    }

                    // 去重 + 直接写入 STATE.history
                    let imported = 0;
                    const existingIds = new Set((window.STATE.history || []).map(r => r.id));
                    for (const rec of records) {
                        if (!rec.id) rec.id = Date.now() + '_' + Math.random().toString(36).substr(2, 8);
                        if (existingIds.has(rec.id)) continue; // 已存在，跳过
                        try { window.STATE.history.push(rec); existingIds.add(rec.id); imported++; }
                        catch(er) { console.warn('[IO补丁] 跳过无效记录', rec, er); }
                    }

                    safeToast(`✅ 成功导入 ${imported} 条记录`);
                    if (typeof BIZ.persistHistory === 'function') BIZ.persistHistory();

                } catch(err) {
                    console.error('[IO补丁] 导入失败', err);
                    safeToast('❌ 导入失败：' + err.message, true);
                }
            };
            reader.onerror = () => {
                safeToast('❌ 文件读取失败', true);
            };
            reader.readAsText(file);

            // 重置选择器，允许重复导入同一个文件
            inputEl.value = '';
        });

        console.log('[IO补丁] ✅ 导入本地文件功能已激活');
    }

    // ==========================================
    // 2️⃣ 导出本地文件
    // ==========================================
    function initLocalExport() {
        const btnEl = document.getElementById('btn_exportLocal');
        if (!btnEl) {
            console.warn('[IO补丁] 找不到导出按钮');
            return;
        }

        btnEl.addEventListener('click', () => {
            try {
                // 收集所有历史记录
                const history = window.STATE.history || [];
                const exportData = {
                    exportedAt: new Date().toISOString(),
                    appVersion: 'V7.0',
                    totalRecords: history.length,
                    history: history.map(r => {
                        // 轻量化：移除运行时引用对象
                        const { _v7, ...rest } = r;
                        return rest;
                    }),
                };

                const jsonStr = JSON.stringify(exportData, null, 2);
                const blob = new Blob([jsonStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);

                // 触发下载
                const a = document.createElement('a');
                a.href = url;
                const now = new Date();
                const ts = now.getFullYear() +
                    String(now.getMonth()+1).padStart(2,'0') +
                    String(now.getDate()).padStart(2,'0') + '_' +
                    String(now.getHours()).padStart(2,'0') +
                    String(now.getMinutes()).padStart(2,'0');
                a.download = `liuren_backup_${ts}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);

                // 延迟释放 Blob URL
                setTimeout(() => URL.revokeObjectURL(url), 5000);

                safeToast(`✅ 已导出 ${history.length} 条记录`);
            } catch(err) {
                console.error('[IO补丁] 导出失败', err);
                safeToast('❌ 导出失败：' + err.message, true);
            }
        });

        console.log('[IO补丁] ✅ 导出本地文件功能已激活');
    }

    // ==========================================
    // 3️⃣ 云端同步（Upstash Redis）
    // ==========================================
    function initCloudSync() {
        const pullBtn = document.getElementById('btn_pullCloud');
        const pushBtn = document.getElementById('btn_pushCloud');

        // 如果没有推送按钮，可能是旧版 UI，给 pull 按钮加长按推送
        if (pushBtn) {
            pushBtn.addEventListener('click', pushToCloud);
        }
        if (pullBtn) {
            pullBtn.addEventListener('click', pullFromCloud);
        }

        // 如果只有一个拉取按钮，点击拉取，双击推送
        if (pullBtn && !pushBtn) {
            let clickTimer = null;
            pullBtn.addEventListener('click', () => {
                if (clickTimer) {
                    clearTimeout(clickTimer);
                    clickTimer = null;
                    pushToCloud(); // 双击 = 推送
                } else {
                    clickTimer = setTimeout(() => {
                        clickTimer = null;
                        pullFromCloud(); // 单击 = 拉取
                    }, 400);
                }
            });
        }

        console.log('[IO补丁] ✅ 云端同步功能已激活');
    }

    // 防重复请求的锁
    let _syncing = false;

    /**
     * 拉取云端数据
     */
    async function pullFromCloud() {
        if (_syncing) { console.log('[IO补丁] 同步进行中，跳过'); return; }
        _syncing = true;
        const cfg = getCloudConfig();
        if (!cfg.url) {
            safeToast('⚠️ 请先在设置里填写 Upstash Redis URL', true);
            openSettings();
            return;
        }

        const pullBtn = document.getElementById('btn_pullCloud');
        if (pullBtn) pullBtn.disabled = true;

        try {
            const url = cfg.url.replace(/\/$/, '') + '/get/liuren_history';
            const headers = {};
            if (cfg.key) headers['Authorization'] = 'Bearer ' + cfg.key;

            const resp = await fetch(url, { headers });
            if (!resp.ok) throw new Error(`服务器返回 ${resp.status}`);

            const json = await resp.json();
            // Upstash Redis get 返回格式: { result: "..." }
            let data = json.result;
            if (typeof data === 'string') data = JSON.parse(data);
            
            const records = data.history || data.records || (Array.isArray(data) ? data : [data]);
            let imported = 0;
            const existingIds = new Set((window.STATE.history || []).map(r => r.id));
            for (const rec of records) {
                if (!rec.id) rec.id = Date.now() + '_' + Math.random().toString(36).substr(2, 8);
                if (existingIds.has(rec.id)) continue;
                try { window.STATE.history.push(rec); existingIds.add(rec.id); imported++; }
                catch(e) { console.warn('[IO补丁] 跳过', rec, e); }
            }

            if (typeof BIZ.persistHistory === 'function') BIZ.persistHistory();
            safeToast(`☁️ 云端拉取完成，导入 ${imported} 条`);

        } catch(err) {
            console.error('[IO补丁] 云端拉取失败', err);
            safeToast('❌ 云端拉取失败：' + err.message, true);
        } finally {
            if (pullBtn) pullBtn.disabled = false;
            _syncing = false;
        }
    }

    /**
     * 推送本地数据到云端
     */
    async function pushToCloud() {
        if (_syncing) { console.log('[IO补丁] 同步进行中，跳过'); return; }
        _syncing = true;
        const cfg = getCloudConfig();
        if (!cfg.url) {
            safeToast('⚠️ 请先在设置里填写 Upstash Redis URL', true);
            openSettings();
            return;
        }

        const pushBtn = document.getElementById('btn_pushCloud') || document.getElementById('btn_pullCloud');
        if (pushBtn) pushBtn.disabled = true;

        try {
            const history = window.STATE.history || [];
            const payload = {
                updatedAt: new Date().toISOString(),
                totalRecords: history.length,
                history: history.map(r => {
                    const { _v7, ...rest } = r;
                    return rest;
                }),
            };

            const url = cfg.url.replace(/\/$/, '') + '/set/liuren_history';
            const headers = { 'Content-Type': 'application/json' };
            if (cfg.key) headers['Authorization'] = 'Bearer ' + cfg.key;

            const resp = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(JSON.stringify(payload)), // Upstash Redis set 需要字符串值
            });

            if (!resp.ok) throw new Error(`服务器返回 ${resp.status}`);

            safeToast(`☁️ 云端推送完成，共 ${history.length} 条`);

        } catch(err) {
            console.error('[IO补丁] 云端推送失败', err);
            safeToast('❌ 云端推送失败：' + err.message, true);
        } finally {
            if (pushBtn) pushBtn.disabled = false;
            _syncing = false;
        }
    }

    /**
     * 滚动到设置区域
     */
    function openSettings() {
        const settingsEl = document.getElementById('cfg_binKey') || document.getElementById('cfg_section');
        if (settingsEl) {
            settingsEl.scrollIntoView({ behavior: 'smooth' });
            setTimeout(() => {
                const keyInput = document.getElementById('cfg_binKey');
                if (keyInput) keyInput.focus();
            }, 500);
        }
    }

    // ==========================================
    // 主入口
    // ==========================================
    async function init() {
        await waitReady();
        initLocalImport();
        initLocalExport();
        initCloudSync();
        console.log('[IO补丁] 🎉 导入/导出/云端同步 全部激活');
    }

    if (document.readyState === 'complete') {
        init();
    } else {
        window.addEventListener('load', init);
    }

})();
