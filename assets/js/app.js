const defaultConfig = {
    app_title: "คะแนนของนักศึกษาสถาบัน Orion",
    admin_code_hash: "7dcb48a2a471c0c3b871fff5e85dfdf46f44293f4abb8e00755829535d787229",
    super_admin_code_hash: "3c521cca231312d8e7c3e782a34f576e1241fc731156eae4d3e849a4cae9b54c",
    background_color: "#0f172a",
    surface_color: "#1e293b",
    text_color: "#f1f5f9",
    primary_action_color: "#3b82f6",
    secondary_action_color: "#64748b"
};

const googleSheetConfig = {
    /**
     * นำ URL ของ Apps Script Web App ที่ deploy แล้วมาใส่ตรงนี้
     * ตัวอย่าง: https://script.google.com/macros/s/XXXXXXXXXXXXXXXX/exec
     */
    scriptUrl: "https://script.google.com/macros/s/AKfycbxe1_aEhEnQmHGsLBEE1lHxm95TWZtOqXm_JijuJyllTRGIbhDThBxCGzrYibXaz2gD/exec"
};

const securityUtils = (() => {
    const escapeMap = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
        "`": "&#96;"
    };
    const rawHtmlMarker = "__rawHtml";
    const textEncoder = typeof TextEncoder !== "undefined" ? new TextEncoder() : null;

    function encodeUtf8(text) {
        if (textEncoder) {
            return textEncoder.encode(text);
        }
        const encoded = unescape(encodeURIComponent(text));
        const result = new Uint8Array(encoded.length);
        for (let i = 0; i < encoded.length; i++) {
            result[i] = encoded.charCodeAt(i);
        }
        return result;
    }

    function sanitizeText(value) {
        if (value === null || value === undefined) return "";
        return String(value).replace(/[&<>"'`]/g, char => escapeMap[char] || char);
    }

    function raw(value) {
        return { [rawHtmlMarker]: true, value: value ?? "" };
    }

    function html(strings, ...values) {
        let result = "";
        strings.forEach((string, index) => {
            result += string;
            if (index < values.length) {
                const value = values[index];
                if (value && value[rawHtmlMarker]) {
                    result += value.value;
                } else if (Array.isArray(value)) {
                    result += value.map(item => (item && item[rawHtmlMarker]) ? item.value : sanitizeText(item)).join("");
                } else {
                    result += sanitizeText(value);
                }
            }
        });
        return result;
    }

    function rightRotate(value, amount) {
        return (value >>> amount) | (value << (32 - amount));
    }

    const roundConstants = [
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
        0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
        0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
        0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
        0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
        0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
        0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
        0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
        0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
        0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
        0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
        0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
        0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
        0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
        0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ];

    function manualSha256(value) {
        const bytes = Array.from(encodeUtf8(value));
        const bitLength = bytes.length * 8;
        const words = [];

        for (let i = 0; i < bytes.length; i++) {
            const index = i >> 2;
            words[index] = (words[index] || 0) | (bytes[i] << ((3 - (i % 4)) * 8));
        }

        const lengthIndex = bytes.length >> 2;
        const remainder = bytes.length % 4;
        words[lengthIndex] = (words[lengthIndex] || 0) | (0x80 << ((3 - remainder) * 8));

        while ((words.length % 16) !== 14) {
            words.push(0);
        }

        const highBits = Math.floor(bitLength / Math.pow(2, 32));
        const lowBits = bitLength & 0xffffffff;
        words.push(highBits);
        words.push(lowBits);

        const hash = [
            0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
            0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
        ];

        for (let i = 0; i < words.length; i += 16) {
            const w = words.slice(i, i + 16);
            for (let t = 16; t < 64; t++) {
                const s0 = rightRotate(w[t - 15], 7) ^ rightRotate(w[t - 15], 18) ^ (w[t - 15] >>> 3);
                const s1 = rightRotate(w[t - 2], 17) ^ rightRotate(w[t - 2], 19) ^ (w[t - 2] >>> 10);
                w[t] = (((w[t - 16] || 0) + s0 + (w[t - 7] || 0) + s1) >>> 0);
            }

            let [a, b, c, d, e, f, g, h] = hash;

            for (let t = 0; t < 64; t++) {
                const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
                const ch = (e & f) ^ (~e & g);
                const temp1 = (h + S1 + ch + roundConstants[t] + (w[t] >>> 0)) >>> 0;
                const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
                const maj = (a & b) ^ (a & c) ^ (b & c);
                const temp2 = (S0 + maj) >>> 0;

                h = g;
                g = f;
                f = e;
                e = (d + temp1) >>> 0;
                d = c;
                c = b;
                b = a;
                a = (temp1 + temp2) >>> 0;
            }

            hash[0] = (hash[0] + a) >>> 0;
            hash[1] = (hash[1] + b) >>> 0;
            hash[2] = (hash[2] + c) >>> 0;
            hash[3] = (hash[3] + d) >>> 0;
            hash[4] = (hash[4] + e) >>> 0;
            hash[5] = (hash[5] + f) >>> 0;
            hash[6] = (hash[6] + g) >>> 0;
            hash[7] = (hash[7] + h) >>> 0;
        }

        return hash.map(part => part.toString(16).padStart(8, "0")).join("");
    }

    async function hashText(value) {
        const text = value === null || value === undefined ? "" : String(value);
        if (!text) return "";
        if (window.crypto?.subtle) {
            const data = encodeUtf8(text);
            const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
            return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
        }
        return manualSha256(text);
    }

    async function verifySecret(value, expectedHash) {
        if (!expectedHash) return false;
        const hashedInput = await hashText(value);
        return hashedInput === expectedHash;
    }

    return { sanitizeText, html, raw, hashText, verifySecret };
})();

const googleSheetDataSdk = (() => {
    const REQUEST_TIMEOUT_MS = 15000;
    const RETRY_LIMIT = 2;
    const CACHE_TTL_MS = 30000;
    const SOFT_REFRESH_DELAY_MS = 1500;

    let onDataChangedCallback = null;
    let cachedRecords = [];
    let lastSyncedAt = 0;
    let syncInFlight = null;
    let softRefreshTimer = null;
    let requestQueue = Promise.resolve();

    function wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function enqueue(task) {
        const next = requestQueue.then(task, task);
        requestQueue = next.catch(() => {});
        return next;
    }

    function notify(records) {
        if (typeof onDataChangedCallback === "function") {
            onDataChangedCallback([...(records || [])]);
        }
    }

    function flattenSnapshot(data) {
        const snapshot = data || {};
        return [
            ...(snapshot.students || []),
            ...(snapshot.transactions || []),
            ...(snapshot.refunds || [])
        ];
    }

    function mergeRecord(record) {
        if (!record) return;
        const safeRecord = { ...record };
        if (!safeRecord.__collection) {
            safeRecord.__collection = resolveCollection(record);
        }
        if (!safeRecord.__backendId) {
            safeRecord.__backendId = `${safeRecord.__collection || "students"}_temp_${Date.now()}`;
        }
        const existingIndex = cachedRecords.findIndex(item => item.__backendId === safeRecord.__backendId);
        if (existingIndex >= 0) {
            cachedRecords[existingIndex] = safeRecord;
        } else {
            cachedRecords.push(safeRecord);
        }
        lastSyncedAt = Date.now();
        notify(cachedRecords);
    }

    function removeRecord(backendId) {
        if (!backendId) return;
        cachedRecords = cachedRecords.filter(item => item.__backendId !== backendId);
        lastSyncedAt = Date.now();
        notify(cachedRecords);
    }

    function scheduleSoftRefresh() {
        if (softRefreshTimer) {
            clearTimeout(softRefreshTimer);
        }
        softRefreshTimer = setTimeout(() => {
            softRefreshTimer = null;
            syncRecords(true).catch(err => console.error("Background resync failed:", err));
        }, SOFT_REFRESH_DELAY_MS);
    }

    async function fetchWithTimeout(action, payload, timeoutMs) {
        const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
        const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
        try {
            const response = await fetch(googleSheetConfig.scriptUrl, {
                method: "POST",
                mode: "cors",
                headers: { "Content-Type": "text/plain" },
                body: JSON.stringify({ action, ...payload }),
                signal: controller?.signal
            });
            const responseText = await response.text().catch(() => "");
            if (!response.ok) {
                const statusMessage = [response.status, response.statusText].filter(Boolean).join(" ").trim();
                const details = responseText ? ` - ${responseText}` : "";
                throw new Error(`Google Apps Script error: ${statusMessage || "Request failed"}${details}`);
            }
            if (!responseText) {
                throw new Error("Google Apps Script returned an empty response");
            }
            let result = null;
            try {
                result = JSON.parse(responseText);
            } catch (parseError) {
                throw new Error(`Invalid JSON from Apps Script: ${parseError.message}`);
            }
            if (!result.success) {
                throw new Error(result.error || "Unknown Apps Script error");
            }
            return result;
        } finally {
            if (timer) {
                clearTimeout(timer);
            }
        }
    }

    async function callAppsScript(action, payload = {}, options = {}) {
        if (!googleSheetConfig.scriptUrl) {
            throw new Error("ยังไม่ได้ตั้งค่า Apps Script URL ใน googleSheetConfig.scriptUrl");
        }

        const retries = Number.isFinite(options.retries) ? options.retries : RETRY_LIMIT;
        const timeoutMs = options.timeoutMs || REQUEST_TIMEOUT_MS;
        let attempt = 0;
        let lastError = null;

        return enqueue(async () => {
            while (attempt <= retries) {
                attempt++;
                try {
                    return await fetchWithTimeout(action, payload, timeoutMs);
                } catch (error) {
                    lastError = error;
                    if (attempt > retries) break;
                    await wait(300 * attempt);
                }
            }
            throw lastError || new Error(`Apps Script call failed for action: ${action}`);
        });
    }

    async function syncRecords(force = false) {
        const isCacheFresh = cachedRecords.length > 0 && Date.now() - lastSyncedAt < CACHE_TTL_MS;
        if (!force && isCacheFresh) {
            notify(cachedRecords);
            return { isOk: true, fromCache: true };
        }
        if (syncInFlight) {
            return syncInFlight;
        }
        syncInFlight = (async () => {
            const result = await callAppsScript("list", {}, { retries: 1 });
            const flattened = flattenSnapshot(result.data);
            cachedRecords = flattened;
            lastSyncedAt = Date.now();
            notify(cachedRecords);
            return { isOk: true, refreshedAt: lastSyncedAt };
        })();
        try {
            return await syncInFlight;
        } finally {
            syncInFlight = null;
        }
    }

    return {
        async init(handler) {
            onDataChangedCallback = handler?.onDataChanged || null;
            await syncRecords(true);
            return { isOk: true };
        },
        async create(record) {
            const result = await callAppsScript("create", { record }, { retries: 3 });
            const savedRecord = result.data?.record || record;
            mergeRecord(savedRecord);
            scheduleSoftRefresh();
            return { isOk: true, record: savedRecord };
        },
        async update(record) {
            const result = await callAppsScript("update", { record }, { retries: 3 });
            const savedRecord = result.data?.record || record;
            mergeRecord(savedRecord);
            scheduleSoftRefresh();
            return { isOk: true, record: savedRecord };
        },
        async delete(record) {
            const targetId = record.__backendId;
            await callAppsScript("delete", { record }, { retries: 2 });
            removeRecord(targetId);
            scheduleSoftRefresh();
            return { isOk: true };
        },
        async reload() {
            await syncRecords(true);
            return { isOk: true };
        }
    };
})();

window.dataSdk = window.dataSdk || googleSheetDataSdk;

function resolveCollection(record) {
    if (record?.transaction_type) return "transactions";
    if (record?.refund_id) return "refunds";
    return "students";
}

function withCollection(record, fallbackCollection) {
    const targetCollection = fallbackCollection || resolveCollection(record);
    return { ...record, __collection: targetCollection };
}

let students = [];
let allRecords = [];
let editingStudent = null;
let studentToDelete = null;
let isLoggedIn = false;
let userType = null;
let currentStudent = null;
let pendingRegistration = null;
let editingStudentData = null;
let teacherTransactions = [];
let refundHistory = [];
let backupHistory = [];
let editingDataRecord = null;
let autoSyncTimer = null;
const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 16;

const dataHandler = {
    onDataChanged(data) {
        allRecords = data || [];
        students = allRecords.filter(record => 
            record.minecraft_username && 
            record.first_name && 
            !record.transaction_type && 
            !record.refund_id
        );
        teacherTransactions = allRecords.filter(record => 
            record.transaction_type && 
            record.transaction_teacher
        );
        refundHistory = allRecords.filter(record => 
            record.refund_id && 
            record.refund_teacher
        );
        updateUI();
        updateDataStatus('synced');
    }
};

async function initializeDataSDK() {
    try {
        updateDataStatus('syncing');
        showPageLoader('กำลังซิงค์ข้อมูล');
        disableLoginButtons();
        if (window.dataSdk) {
            const result = await window.dataSdk.init(dataHandler);
            if (result.isOk) {
                console.log('Data SDK initialized successfully');
                updateDataStatus('synced');
                startAutoSync();
                enableLoginButtons();
                hidePageLoader();
            } else {
                console.error('Failed to initialize Data SDK:', result.error);
                updateDataStatus('error');
                showPageLoader('⚠️ เกิดข้อผิดพลาดในการโหลดข้อมูล');
                setTimeout(() => hidePageLoader(), 3000);
            }
        }
    } catch (error) {
        console.error('Error initializing Data SDK:', error);
        updateDataStatus('error');
        showPageLoader('⚠️ เกิดข้อผิดพลาดในการโหลดข้อมูล');
        setTimeout(() => hidePageLoader(), 3000);
    }
}

async function initializeElementSDK() {
    try {
        if (window.elementSdk) {
            await window.elementSdk.init({
                defaultConfig: defaultConfig,
                onConfigChange: async (config) => {
                    document.documentElement.style.setProperty('--bg-color', config.background_color || defaultConfig.background_color);
                    document.documentElement.style.setProperty('--surface-color', config.surface_color || defaultConfig.surface_color);
                    document.documentElement.style.setProperty('--text-color', config.text_color || defaultConfig.text_color);
                    const titleElement = document.getElementById('login-title');
                    if (titleElement && config.app_title) {
                        titleElement.textContent = config.app_title;
                    }
                },
                mapToCapabilities: (config) => ({
                    recolorables: [
                        {
                            get: () => config.background_color || defaultConfig.background_color,
                            set: (value) => window.elementSdk && window.elementSdk.setConfig({ background_color: value })
                        },
                        {
                            get: () => config.surface_color || defaultConfig.surface_color,
                            set: (value) => window.elementSdk && window.elementSdk.setConfig({ surface_color: value })
                        },
                        {
                            get: () => config.text_color || defaultConfig.text_color,
                            set: (value) => window.elementSdk && window.elementSdk.setConfig({ text_color: value })
                        },
                        {
                            get: () => config.primary_action_color || defaultConfig.primary_action_color,
                            set: (value) => window.elementSdk && window.elementSdk.setConfig({ primary_action_color: value })
                        },
                        {
                            get: () => config.secondary_action_color || defaultConfig.secondary_action_color,
                            set: (value) => window.elementSdk && window.elementSdk.setConfig({ secondary_action_color: value })
                        }
                    ],
                    borderables: [],
                    fontEditable: undefined,
                    fontSizeable: undefined
                }),
                mapToEditPanelValues: (config) => new Map([
                    ["app_title", config.app_title || defaultConfig.app_title]
                ])
            });
        }
    } catch (error) {
        console.error('Error initializing Element SDK:', error);
    }
}

function updateDataStatus(status) {
    const statusElements = [
        'data-status',
        'student-data-status', 
        'teacher-data-status',
        'admin-data-status',
        'quick-data-status'
    ];

    statusElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.className = '';
            switch (status) {
                case 'syncing':
                    element.className = 'data-syncing';
                    element.textContent = '🔄 กำลังซิงค์...';
                    break;
                case 'synced':
                    element.className = 'data-saved';
                    element.textContent = '✅ ข้อมูลซิงค์แล้ว';
                    break;
                case 'error':
                    element.className = 'data-error';
                    element.textContent = '⚠️ เกิดข้อผิดพลาด';
                    break;
                default:
                    element.className = 'data-saved';
                    element.textContent = 'ℹ️ ข้อมูลพร้อมใช้งาน';
            }
        }
    });

    const now = new Date().toLocaleString('th-TH');
    const syncElements = [
        'student-last-update',
        'teacher-last-sync',
        'admin-last-sync'
    ];

    syncElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = `อัปเดต: ${now}`;
        }
    });
}
function startAutoSync() {
    if (autoSyncTimer || !window.dataSdk) return;
    autoSyncTimer = setInterval(async () => {
        try {
            await window.dataSdk.reload();
        } catch (error) {
            console.error('Auto sync failed:', error);
            updateDataStatus('error');
        }
    }, 5000);
}
const minecraftPlayers = [
    { "uuid": "694adebb-93b8-4fe1-a9b4-49e19d930eed", "name": "mintfelicity" },
    { "uuid": "29a4dfad-b181-48ac-9a2b-c06d5cdaf06c", "name": "Kisezz" },
    { "uuid": "ea15b5cf-ca91-467f-b681-587b2aa806ff", "name": "POND_DY" },
    { "uuid": "353de8dd-f385-409d-9438-751f1a3de7cb", "name": "MonmuV" },
    { "uuid": "4d04a08e-e3c2-432e-9db0-01cad84bb325", "name": "zemon_M" },
    { "uuid": "8d0b66ed-50b9-4ba2-affd-27d8c825f43a", "name": "Tynarin_Sovarin" },
    { "uuid": "27e528b2-3629-4ec6-bc13-ee66849ed92d", "name": "Lengnaka" },
    { "uuid": "e007c14c-9f60-474c-9f83-e9b6bfa600f1", "name": "LEOPORTG" },
    { "uuid": "b0726e99-f1f7-4d9a-95ba-7a5ec7497906", "name": "White144454" },
    { "uuid": "b8b4aca3-7d6b-4273-8b08-268269172c9d", "name": "Atom_motA" },
    { "uuid": "70ae89dd-5c22-4e3e-8683-9d2accec2482", "name": "Pioniee" },
    { "uuid": "e1aed8bd-b313-40a6-aead-027ca2b6a857", "name": "ZoZero2005" },
    { "uuid": "b44979d1-9213-4241-b13b-d6e89584d749", "name": "Gigi_2210" },
    { "uuid": "15e5ecdd-b9e6-46c3-8dbd-ba916081cfbd", "name": "OSARUKUNG" },
    { "uuid": "ca0d5a8c-8077-4a46-b8a6-5a5cfc3e87c2", "name": "QUA001P" },
    { "uuid": "fc48404b-eab2-4831-8e5f-2ab85c3367df", "name": "nannk1144" },
    { "uuid": "b8a489f6-342d-4e5a-af4c-a35f3348ecfd", "name": "DEPRAVITYs" },
    { "uuid": "7abc69fb-dae0-4dd8-bbf1-8b062024c9a5", "name": "zencxL" },
    { "uuid": "01791871-40f7-4cc6-b2d8-0cc496909bb1", "name": "TO_99" },
    { "uuid": "ff769c43-d312-47b8-845e-9b53b70e8ae5", "name": "Akira_AkaSan" },
    { "uuid": "f1f0bf5e-ae91-4b16-9892-9c4c8e7ba1d9", "name": "_Cinz_" },
    { "uuid": "9caa0f06-92a5-497c-88e4-4aa62ee7cc6a", "name": "WorldGG" },
    { "uuid": "46616cb9-019d-4437-8d14-ce745820c1b1", "name": "Shimonsan" },
    { "uuid": "1fb30288-239e-4c8f-ba33-ee183c662579", "name": "5Ru_YamA" },
    { "uuid": "e67cf053-6115-4839-ae4c-732faf97f44e", "name": "RK5834" },
    { "uuid": "cf044660-42df-42dc-9850-d40bd2e01805", "name": "ToRu_0525" },
    { "uuid": "3acc7362-e94b-4e90-b0ff-777a4c0a3d9a", "name": "First23112009" },
    { "uuid": "683f90c1-ae0f-411b-920b-3fc06618dff2", "name": "Luna133763" },
    { "uuid": "85c2b427-c28f-4a0f-aca3-043a32181b4c", "name": "Himakun_" },
    { "uuid": "acfb85f4-ad18-424d-a11c-398a5b54589a", "name": "K_kan_" },
    { "uuid": "328dd7a2-7c3f-47fa-bb98-2f3610053765", "name": "blaqblep" },
    { "uuid": "01cf46c4-17ad-42cf-9e7c-fce2473716e6", "name": "PeemZaKub" },
    { "uuid": "0dba4b86-f508-471c-a538-5809bed07022", "name": "Nai37437" },
    { "uuid": "b539a441-358b-458c-87c4-721473cc7605", "name": "fluke048" },
    { "uuid": "d68a8693-8b26-4493-ae1f-45a88b33bd5f", "name": "AsiaNaJa" },
    { "uuid": "84be45e6-d288-40d7-9d25-f7420c9ca95e", "name": "Whoswh4le_" },
    { "uuid": "0de27a00-49e5-4708-86c6-6552ae929319", "name": "Nanevy_06" },
    { "uuid": "421e2b99-ae51-4006-bcab-898fa7697fcb", "name": "Habznm" },
    { "uuid": "33edcdd9-e027-4567-b9bd-feacd1c2913e", "name": "_SIXEY" },
    { "uuid": "79d9ef76-ca9e-4991-8170-426c48f7047b", "name": "_GOT08_" },
    { "uuid": "39d78e9c-68da-4bc8-9839-4a156aafa6ef", "name": "SSRIRSS" },
    { "uuid": "a526c475-3663-456b-b2b9-b0f3e149c477", "name": "Mika_miyasaki" },
    { "uuid": "015793c0-33a2-4792-8e51-c9bcdb1a666e", "name": "jrjj112" },
    { "uuid": "6adfd028-d3fa-440e-88fd-de32c0ce3f44", "name": "Kjofex2" },
    { "uuid": "d8d51373-27cb-4aea-b488-c70790cd4787", "name": "LRS_Karma" },
    { "uuid": "2b5c5927-70c4-49e6-9aff-06b11803373a", "name": "Asteria_x086" },
    { "uuid": "eb73d41d-b7d6-435c-bba1-25610612df68", "name": "_MAJ0R" },
    { "uuid": "e985139e-d103-409c-b6b9-beb5f9ae396f", "name": "BeamDeity" },
    { "uuid": "f6b67342-2aad-4aba-8c4f-82a2f3f0bf0c", "name": "KuroIbara260267" },
    { "uuid": "b1e73e37-e9b4-4763-8f6e-9084db705efc", "name": "xXGitXx" },  
    { "uuid": "a8ad17ff-8d09-4ff9-8190-ccca38ecf090", "name": "_LoKiT_" },
    { "uuid": "ad18ef19-a855-425f-8474-6fcecc6027a9", "name": "Jeweloobaby" },
    { "uuid": "1af933fd-47b2-43f5-9866-e878b2f3b1c5", "name": "Yochi_san" },
    { "uuid": "a65e5d26-f155-4a5c-aa54-4fa570521929", "name": "martiNMaeL" }
];

function showLoading(buttonId, loadingId) {
    const button = document.getElementById(buttonId);
    const loading = document.getElementById(loadingId);
    if (button) button.disabled = true;
    if (loading) loading.classList.remove('hidden');
}

function hideLoading(buttonId, loadingId) {
    const button = document.getElementById(buttonId);
    const loading = document.getElementById(loadingId);
    if (button) button.disabled = false;
    if (loading) loading.classList.add('hidden');
}

function showPageLoader(message = 'กำลังโหลดข้อมูล...') {
    const loader = document.getElementById('page-loader');
    const text = document.getElementById('page-loader-text');
    if (text && message) {
        text.textContent = message;
    }
    if (loader) {
        loader.classList.remove('hidden', 'fade-out');
    }
}

function hidePageLoader() {
    const loader = document.getElementById('page-loader');
    if (!loader) return;
    loader.classList.add('fade-out');
    setTimeout(() => loader.classList.add('hidden'), 300);
}

function disableLoginButtons() {
    const studentButton = document.getElementById('student-login-button');
    const adminButton = document.getElementById('admin-login-button');
    const studentInput = document.getElementById('student-login-name');
    const adminInput = document.getElementById('admin-password');
    
    if (studentButton) {
        studentButton.disabled = true;
        studentButton.style.opacity = '0.5';
        studentButton.style.cursor = 'not-allowed';
    }
    if (adminButton) {
        adminButton.disabled = true;
        adminButton.style.opacity = '0.5';
        adminButton.style.cursor = 'not-allowed';
    }
    if (studentInput) {
        studentInput.disabled = true;
        studentInput.style.opacity = '0.7';
    }
    if (adminInput) {
        adminInput.disabled = true;
        adminInput.style.opacity = '0.7';
    }
}

function enableLoginButtons() {
    const studentButton = document.getElementById('student-login-button');
    const adminButton = document.getElementById('admin-login-button');
    const studentInput = document.getElementById('student-login-name');
    const adminInput = document.getElementById('admin-password');
    
    if (studentButton) {
        studentButton.disabled = false;
        studentButton.style.opacity = '1';
        studentButton.style.cursor = 'pointer';
    }
    if (adminButton) {
        adminButton.disabled = false;
        adminButton.style.opacity = '1';
        adminButton.style.cursor = 'pointer';
    }
    if (studentInput) {
        studentInput.disabled = false;
        studentInput.style.opacity = '1';
    }
    if (adminInput) {
        adminInput.disabled = false;
        adminInput.style.opacity = '1';
    }
}

function showError(errorId, message) {
    const errorDiv = document.getElementById(errorId);
    const messageSpan = document.getElementById(errorId.replace('error', 'error-message'));
    if (errorDiv) {
        errorDiv.classList.remove('hidden');
        if (messageSpan) messageSpan.textContent = message;
        setTimeout(() => errorDiv.classList.add('hidden'), 5000);
    }
}

function hideError(errorId) {
    const errorDiv = document.getElementById(errorId);
    if (errorDiv) errorDiv.classList.add('hidden');
}

function validateUsername(username, currentBackendId = null) {
    const name = username?.trim() || '';
    if (name.length < USERNAME_MIN_LENGTH || name.length > USERNAME_MAX_LENGTH) {
        return { valid: false, message: `Username ต้องมี ${USERNAME_MIN_LENGTH}-${USERNAME_MAX_LENGTH} ตัวอักษร` };
    }
    const duplicate = students.find(s => 
        s.minecraft_username?.toLowerCase() === name.toLowerCase() &&
        (!currentBackendId || s.__backendId !== currentBackendId)
    );
    if (duplicate) {
        return { valid: false, message: 'Username นี้ถูกใช้แล้ว' };
    }
    return { valid: true };
}

function getTeacherName() {
    const teacherNameInput = document.getElementById('teacher-name-input');
    if (!teacherNameInput) return null;
    const teacherName = teacherNameInput.value.trim();
    if (!teacherName) {
        showTeacherNameError('กรุณากรอกชื่ออาจารย์ก่อนทำรายการ');
        return null;
    }
    return teacherName;
}

function getMoneyReason() {
    const reasonInput = document.getElementById('money-reason-input');
    if (!reasonInput) return null;
    const reason = reasonInput.value.trim();
    if (!reason) {
        showMoneyReasonError('กรุณากรอกเหตุผลการหักเงินก่อนทำรายการ');
        return null;
    }
    return reason;
}

function showTeacherNameError(message) {
    const input = document.getElementById('teacher-name-input');
    if (!input) return;
    input.style.borderColor = '#ef4444';
    input.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.2)';
    let errorDiv = document.getElementById('teacher-name-error');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.id = 'teacher-name-error';
        errorDiv.className = 'text-xs text-red-400 mt-1 bg-red-900/20 border border-red-500/30 rounded p-2';
        input.parentNode.appendChild(errorDiv);
    }
    errorDiv.textContent = `⚠️ ${message}`;
    setTimeout(() => {
        input.style.borderColor = '';
        input.style.boxShadow = '';
        if (errorDiv) {
            errorDiv.remove();
        }
    }, 3000);
    input.focus();
}

function showMoneyReasonError(message) {
    const input = document.getElementById('money-reason-input');
    if (!input) return;
    input.style.borderColor = '#ef4444';
    input.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.2)';
    let errorDiv = document.getElementById('money-reason-error');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.id = 'money-reason-error';
        errorDiv.className = 'text-xs text-red-400 mt-1 bg-red-900/20 border border-red-500/30 rounded p-2';
        input.parentNode.appendChild(errorDiv);
    }
    errorDiv.textContent = `⚠️ ${message}`;
    setTimeout(() => {
        input.style.borderColor = '';
        input.style.boxShadow = '';
        if (errorDiv) {
            errorDiv.remove();
        }
    }, 3000);
    input.focus();
}
async function recordTransaction(studentId, type, amount, reason, teacherName = 'system') {
    try {
        if (allRecords.length >= 999) {
            console.warn('Data limit reached, cannot record transaction');
            return false;
        }
        const student = students.find(s => s.__backendId === studentId);
        if (!student) return false;
        const transaction = {
            transaction_id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            transaction_type: type,
            transaction_teacher: teacherName,
            transaction_amount: amount,
            transaction_reason: reason,
            transaction_timestamp: new Date().toISOString(),
            student_id: studentId,
            student_name: `${student.first_name} ${student.last_name}`,
            student_username: student.minecraft_username,
            created_at: new Date().toISOString()
        };
                if (window.dataSdk) {
                    const transactionRecord = withCollection(transaction, "transactions");
                    const result = await window.dataSdk.create(transactionRecord);
            return result.isOk;
        }
        return false;
    } catch (error) {
        console.error('Error recording transaction:', error);
        return false;
    }
}

function handleStudentLogin(username) {
    const minecraftPlayer = minecraftPlayers.find(p => p.name.toLowerCase() === username.toLowerCase());
    if (minecraftPlayer) {
        const existingStudent = students.find(s => s.minecraft_username === username);
        if (existingStudent) {
            currentStudent = existingStudent;
            userType = 'student';
            isLoggedIn = true;
            showStudentView();
        } else {
            pendingRegistration = minecraftPlayer;
            showRegistrationScreen();
        }
    } else {
        const existingStudent = students.find(s => s.minecraft_username === username);
        if (existingStudent) {
            if (existingStudent.first_name && existingStudent.last_name && existingStudent.house) {
                currentStudent = existingStudent;
                userType = 'student';
                isLoggedIn = true;
                showStudentView();
            } else {
                pendingRegistration = { name: username, uuid: 'custom-' + Date.now() };
                showRegistrationScreen();
            }
        } else {
            showError('login-error', 'ไม่พบ Username นี้ในระบบ กรุณาติดต่ออาจารย์');
        }
    }
}

async function handleTeacherLogin(password) {
    try {
        const isValid = await securityUtils.verifySecret(password, defaultConfig.admin_code_hash);
        if (isValid) {
            userType = 'teacher';
            isLoggedIn = true;
            showTeacherView();
        } else {
            showError('login-error', 'รหัสอาจารย์ไม่ถูกต้อง');
        }
    } catch (error) {
        console.error('Security error verifying teacher login:', error);
        showError('login-error', 'ระบบความปลอดภัยยังไม่พร้อมใช้งาน');
    }
}

async function handleSuperAdminLogin(password) {
    try {
        const isValid = await securityUtils.verifySecret(password, defaultConfig.super_admin_code_hash);
        if (isValid) {
            userType = 'admin';
            isLoggedIn = true;
            showAdminView();
            closeSuperAdminModal();
        } else {
            showError('super-admin-error', 'รหัส Super Admin ไม่ถูกต้อง');
        }
    } catch (error) {
        console.error('Security error verifying super admin login:', error);
        showError('super-admin-error', 'ระบบความปลอดภัยยังไม่พร้อมใช้งาน');
    }
}

async function registerStudent(formData) {
    try {
        if (allRecords.length >= 999) {
            showError('registration-error', 'ระบบเต็ม ไม่สามารถลงทะเบียนเพิ่มได้');
            return false;
        }
        const usernameCheck = validateUsername(pendingRegistration?.name);
        if (!usernameCheck.valid) {
            showError('registration-error', usernameCheck.message);
            return false;
        }
        updateDataStatus('syncing');
        const studentData = {
            id: pendingRegistration.uuid,
            minecraft_username: pendingRegistration.name,
            first_name: formData.firstName,
            last_name: formData.lastName,
            house: formData.house,
            role: 'normal',
            score: 0,
            money_deducted: 0,
            player_type: pendingRegistration.uuid.startsWith('custom-') ? 'custom' : 'minecraft',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
                if (window.dataSdk) {
                    const record = withCollection(studentData, "students");
                    const result = await window.dataSdk.create(record);
            if (result.isOk) {
                const saved = result.record || studentData;
                currentStudent = saved;
                userType = 'student';
                isLoggedIn = true;
                showStudentView();
                updateDataStatus('synced');
                return true;
            } else {
                showError('registration-error', 'เกิดข้อผิดพลาดในการลงทะเบียน');
                updateDataStatus('error');
                return false;
            }
        } else {
            showError('registration-error', 'ระบบไม่พร้อมใช้งาน');
            updateDataStatus('error');
            return false;
        }
    } catch (error) {
        console.error('Registration error:', error);
        showError('registration-error', 'เกิดข้อผิดพลาดในการลงทะเบียน');
        updateDataStatus('error');
        return false;
    }
}
async function updateStudentScore(studentId, newScore, teacherName = null) {
    try {
        if (!teacherName) {
            teacherName = getTeacherName();
            if (!teacherName) return false;
        }
        updateDataStatus('syncing');
        const student = students.find(s => s.__backendId === studentId);
        if (!student) return false;
        const oldScore = student.score || 0;
        const updatedStudent = { 
            ...student, 
            score: parseInt(newScore),
            updated_at: new Date().toISOString()
        };
                if (window.dataSdk) {
                    const record = withCollection(updatedStudent, "students");
                    const result = await window.dataSdk.update(record);
            if (result.isOk) {
                const scoreDiff = parseInt(newScore) - oldScore;
                await recordTransaction(
                    studentId, 
                    'score_change', 
                    scoreDiff, 
                    `เปลี่ยนคะแนนจาก ${oldScore} เป็น ${newScore}`,
                    teacherName
                );
                updateDataStatus('synced');
                return true;
            }
        }
        updateDataStatus('error');
        return false;
    } catch (error) {
        console.error('Error updating score:', error);
        updateDataStatus('error');
        return false;
    }
}

async function updateStudentMoney(studentId, newAmount, teacherName = null, customReason = null) {
    try {
        if (!teacherName) {
            teacherName = getTeacherName();
            if (!teacherName) return false;
        }
        let moneyReason = customReason;
        if (!moneyReason) {
            moneyReason = getMoneyReason();
            if (!moneyReason) return false;
        }
        updateDataStatus('syncing');
        const student = students.find(s => s.__backendId === studentId);
        if (!student) return false;
        const oldAmount = student.money_deducted || 0;
        const updatedStudent = { 
            ...student, 
            money_deducted: parseInt(newAmount),
            updated_at: new Date().toISOString()
        };
                if (window.dataSdk) {
                    const record = withCollection(updatedStudent, "students");
                    const result = await window.dataSdk.update(record);
            if (result.isOk) {
                const moneyDiff = parseInt(newAmount) - oldAmount;
                let transactionType = 'deduct';
                let reason = moneyReason;
                if (moneyDiff > 0) {
                    transactionType = 'deduct';
                    reason = `หักเงิน ${moneyDiff} บาท - ${moneyReason}`;
                } else if (moneyDiff < 0) {
                    transactionType = 'reduce';
                    reason = `ลดเงิน ${Math.abs(moneyDiff)} บาท - ${moneyReason}`;
                } else if (newAmount === 0) {
                    transactionType = 'reset';
                    reason = `รีเซ็ตเงินเป็น 0 - ${moneyReason}`;
                }
                await recordTransaction(
                    studentId, 
                    transactionType, 
                    Math.abs(moneyDiff), 
                    reason,
                    teacherName
                );
                const reasonInput = document.getElementById('money-reason-input');
                if (reasonInput) {
                    reasonInput.value = '';
                }
                updateDataStatus('synced');
                return true;
            }
        }
        updateDataStatus('error');
        return false;
    } catch (error) {
        console.error('Error updating money:', error);
        updateDataStatus('error');
        return false;
    }
}

async function deleteStudent(studentId, teacherName = null) {
    try {
        if (!teacherName && userType === 'admin') {
            teacherName = getTeacherName();
            if (!teacherName) return false;
        }
        updateDataStatus('syncing');
        const student = students.find(s => s.__backendId === studentId);
        if (!student) return false;
                if (window.dataSdk) {
                    const record = withCollection(student, "students");
                    const result = await window.dataSdk.delete(record);
            if (result.isOk) {
                await recordTransaction(
                    studentId, 
                    'delete', 
                    0, 
                    `ลบข้อมูลนักศึกษา ${student.first_name} ${student.last_name}`,
                    teacherName || (userType === 'teacher' ? 'teacher' : 'admin')
                );
                updateDataStatus('synced');
                return true;
            }
        }
        updateDataStatus('error');
        return false;
    } catch (error) {
        console.error('Error deleting student:', error);
        updateDataStatus('error');
        return false;
    }
}

async function exportAllData() {
    try {
        const exportData = {
            students: students,
            transactions: teacherTransactions,
            refunds: refundHistory,
            metadata: {
                exportDate: new Date().toISOString(),
                totalRecords: allRecords.length,
                version: '1.0'
            }
        };
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `student_data_backup_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        const backup = {
            id: `backup_${Date.now()}`,
            type: 'full_export',
            timestamp: new Date().toISOString(),
            recordCount: allRecords.length
        };
        backupHistory.push(backup);
        return true;
    } catch (error) {
        console.error('Error exporting data:', error);
        return false;
    }
}

async function importData(file) {
    try {
        updateDataStatus('syncing');
        const text = await file.text();
        const importData = JSON.parse(text);
        if (!importData.students || !Array.isArray(importData.students)) {
            throw new Error('Invalid data format');
        }
        if (userType === 'admin') {
            console.log('Import functionality requires careful implementation');
        }
        updateDataStatus('synced');
        return true;
    } catch (error) {
        console.error('Error importing data:', error);
        updateDataStatus('error');
        return false;
    }
}
function updateUI() {
    updateStatistics();
    updateStudentsList();
    updateScoreCards();
    updateStudentView();
    updateTransactionCounts();
}

function updateStatistics() {
    const totalStudents = students.length;
    const totalScore = students.reduce((sum, s) => sum + (s.score || 0), 0);
    const averageScore = totalStudents > 0 ? Math.round(totalScore / totalStudents) : 0;
    const highestScore = totalStudents > 0 ? Math.max(...students.map(s => s.score || 0)) : 0;
    const statElements = [
        { id: 'teacher-total-students', value: totalStudents },
        { id: 'teacher-average-score', value: averageScore },
        { id: 'teacher-highest-score', value: highestScore },
        { id: 'teacher-total-transactions', value: teacherTransactions.length },
        { id: 'admin-total-students', value: totalStudents },
        { id: 'admin-average-score', value: averageScore },
        { id: 'admin-highest-score', value: highestScore },
        { id: 'admin-total-records', value: allRecords.length },
        { id: 'class-average', value: averageScore },
        { id: 'class-highest', value: highestScore },
        { id: 'class-total', value: totalStudents }
    ];
    statElements.forEach(({ id, value }) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    });
}

function updateStudentsList() {
    const teacherList = document.getElementById('teacher-students-list');
    const adminList = document.getElementById('admin-students-list');
    const teacherEmpty = document.getElementById('teacher-empty-state');
    const adminEmpty = document.getElementById('admin-empty-state');
    if (students.length === 0) {
        if (teacherEmpty) teacherEmpty.style.display = 'table-row';
        if (adminEmpty) adminEmpty.style.display = 'table-row';
        if (teacherList) {
            const rows = teacherList.querySelectorAll('tr:not(#teacher-empty-state)');
            rows.forEach(row => row.remove());
        }
        if (adminList) {
            const rows = adminList.querySelectorAll('tr:not(#admin-empty-state)');
            rows.forEach(row => row.remove());
        }
        return;
    }
    if (teacherEmpty) teacherEmpty.style.display = 'none';
    if (adminEmpty) adminEmpty.style.display = 'none';
    const sortedStudents = [...students].sort((a, b) => (b.score || 0) - (a.score || 0));
    [teacherList, adminList].forEach(list => {
        if (!list) return;
        const existingRows = list.querySelectorAll('tr:not([id$="-empty-state"])');
        existingRows.forEach(row => row.remove());
        sortedStudents.forEach((student, index) => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-slate-700/50 transition-colors';
            const houseIcon = student.house === 'hades' ? '🐉' : student.house === 'ceres' ? '🌿' : '🏠';
            const roleIcon = getRoleIcon(student.role);
            const playerTypeIcon = student.player_type === 'minecraft' ? '🎮' : '👤';
            const adminButtons = list === adminList ? securityUtils.raw(`
                        <button onclick="openEditStudentModal('${student.__backendId}')"
                                class="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-xs transition-colors">
                            แก้ไข
                        </button>
                        <button onclick="confirmDeleteStudent('${student.__backendId}')"
                                class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs transition-colors">
                            ลบ
                        </button>
                        `) : '';
            row.innerHTML = securityUtils.html`
                <td class="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <div class="text-sm font-medium text-white">
                            ${student.first_name} ${student.last_name}
                        </div>
                        <div class="text-xs text-slate-400 ml-2">
                            #${index + 1}
                        </div>
                    </div>
                </td>
                <td class="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <span class="mr-1">${playerTypeIcon}</span>
                        <span class="text-sm text-blue-400 font-mono">${student.minecraft_username}</span>
                    </div>
                </td>
                <td class="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                    <span class="text-sm text-slate-300">${houseIcon} ${getHouseName(student.house)}</span>
                </td>
                <td class="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                    <span class="text-sm text-slate-300">${roleIcon} ${getRoleName(student.role)}</span>
                </td>
                <td class="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                    <span class="text-lg font-bold ${getScoreColor(student.score || 0)}">${student.score || 0}</span>
                </td>
                <td class="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                    <span class="text-lg font-bold text-red-400">${student.money_deducted || 0}</span>
                </td>
                <td class="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm font-medium">
                    <div class="flex gap-2">
                        <button onclick="openQuickScoreModal('${student.__backendId}')"
                                class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs transition-colors">
                            จัดการ
                        </button>
                        ${adminButtons}
                    </div>
                </td>
            `;
            list.appendChild(row);
        });
    });
}

function updateScoreCards() {
    const teacherContainer = document.getElementById('teacher-score-cards-container');
    const adminContainer = document.getElementById('admin-score-cards-container');
    const teacherEmpty = document.getElementById('teacher-score-cards-empty');
    const adminEmpty = document.getElementById('admin-score-cards-empty');
    if (students.length === 0) {
        if (teacherEmpty) teacherEmpty.style.display = 'block';
        if (adminEmpty) adminEmpty.style.display = 'block';
        if (teacherContainer) teacherContainer.innerHTML = '';
        if (adminContainer) adminContainer.innerHTML = '';
        return;
    }
    if (teacherEmpty) teacherEmpty.style.display = 'none';
    if (adminEmpty) adminEmpty.style.display = 'none';
    const sortedStudents = [...students].sort((a, b) => (b.score || 0) - (a.score || 0));
    [teacherContainer, adminContainer].forEach(container => {
        if (!container) return;
        container.innerHTML = '';
        sortedStudents.forEach((student, index) => {
            const card = document.createElement('div');
            card.className = 'score-card-glow rounded-xl p-4 cursor-pointer transition-all duration-300 hover:scale-105';
            card.onclick = () => openQuickScoreModal(student.__backendId);
            const houseIcon = student.house === 'hades' ? '🐉' : student.house === 'ceres' ? '🌿' : '🏠';
            const playerTypeIcon = student.player_type === 'minecraft' ? '🎮' : '👤';
            card.innerHTML = securityUtils.html`
                <div class="text-center">
                    <div class="flex items-center justify-center mb-2">
                        <span class="text-lg">${houseIcon}</span>
                        <span class="text-xs ml-1">${playerTypeIcon}</span>
                    </div>
                    <h3 class="text-sm font-semibold text-white mb-1 truncate" title="${student.first_name} ${student.last_name}">
                        ${student.first_name}
                    </h3>
                    <p class="text-xs text-slate-400 mb-2 truncate" title="${student.minecraft_username}">
                        ${student.minecraft_username}
                    </p>
                    <div class="text-2xl font-bold ${getScoreColor(student.score || 0)} mb-1">
                        ${student.score || 0}
                    </div>
                    <div class="text-xs text-red-400">
                        -${student.money_deducted || 0}฿
                    </div>
                    <div class="text-xs text-slate-500 mt-1">
                        #${index + 1}
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    });
}
function updateStudentView() {
    if (userType !== 'student' || !currentStudent) return;
    const elements = {
        'student-real-name': `${currentStudent.first_name} ${currentStudent.last_name}`,
        'student-minecraft-name': `🎮 Minecraft: ${currentStudent.minecraft_username}`,
        'student-house-display': `🏠 บ้าน: ${getHouseName(currentStudent.house)}`,
        'student-role-display': `🎭 บทบาท: ${getRoleName(currentStudent.role)}`,
        'student-id-display': `UUID: ${currentStudent.id}`,
        'student-score': currentStudent.score || 0
    };
    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
            if (id === 'student-score') {
                element.className = `text-4xl sm:text-6xl font-bold ${getScoreColor(currentStudent.score || 0)}`;
            }
        }
    });
    const houseIcon = document.getElementById('student-house-icon');
    if (houseIcon) {
        const icon = currentStudent.house === 'hades' ? '⚫' : currentStudent.house === 'ceres' ? '⚪' : '🏠';
        houseIcon.innerHTML = securityUtils.html`<span class="text-2xl sm:text-3xl">${icon}</span>`;
    }
    const sortedStudents = [...students].sort((a, b) => (b.score || 0) - (a.score || 0));
    const rank = sortedStudents.findIndex(s => s.__backendId === currentStudent.__backendId) + 1;
    const rankElement = document.getElementById('student-rank');
    if (rankElement) {
        rankElement.innerHTML = securityUtils.html`
            <div class="text-center">
                <p class="text-sm text-slate-400">อันดับที่</p>
                <p class="text-2xl font-bold text-yellow-400">${rank}</p>
                <p class="text-xs text-slate-500">จาก ${students.length} คน</p>
            </div>
        `;
    }
}

function updateTransactionCounts() {
    const elements = [
        { id: 'all-transactions-count', value: teacherTransactions.length },
        { id: 'admin-all-records-count', value: allRecords.length },
        { id: 'teacher-transactions-count', value: teacherTransactions.length },
        { id: 'refund-history-count', value: refundHistory.length },
        { id: 'admin-transactions-count', value: teacherTransactions.length }
    ];
    elements.forEach(({ id, value }) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    });
}

function getHouseName(house) {
    const houses = {
        'hades': 'เฮเดส',
        'ceres': 'เซเรส',
        'other': 'อื่นๆ'
    };
    return houses[house] || 'ไม่ระบุ';
}

function getRoleName(role) {
    const roles = {
        'normal': 'นักเรียนทั่วไป',
        'medical': 'นักเรียนแพทย์',
        'council': 'สภานักเรียน',
        'senior': 'รุ่นพี่'
    };
    return roles[role] || 'ไม่ระบุ';
}

function getRoleIcon(role) {
    const icons = {
        'normal': '?????',
        'medical': '??',
        'council': '???',
        'senior': '???'
    };
    return icons[role] || '??';
}

function getScoreColor(score) {
    if (score >= 500) return 'text-pink-400';
    if (score >= 400) return 'text-purple-400';
    if (score >= 300) return 'text-indigo-400';
    if (score >= 250) return 'text-sky-400';
    if (score >= 200) return 'text-emerald-400';
    if (score >= 150) return 'text-lime-400';
    if (score >= 120) return 'text-yellow-400';
    if (score >= 100) return 'text-amber-400';
    if (score >= 80) return 'text-orange-400';
    if (score >= 60) return 'text-red-400';
    if (score >= 40) return 'text-rose-400';
    if (score >= 20) return 'text-blue-400';
    if (score >= 10) return 'text-gray-400';
    return 'text-slate-500';
}

function getScoreColorHex(score) {
    if (score >= 500) return '#f472b6';
    if (score >= 400) return '#a78bfa';
    if (score >= 300) return '#818cf8';
    if (score >= 250) return '#38bdf8';
    if (score >= 200) return '#34d399';
    if (score >= 150) return '#a3e635';
    if (score >= 120) return '#fbbf24';
    if (score >= 100) return '#fbbf24';
    if (score >= 80) return '#fb923c';
    if (score >= 60) return '#f87171';
    if (score >= 40) return '#fb7185';
    if (score >= 20) return '#60a5fa';
    if (score >= 10) return '#9ca3af';
    return '#64748b';
}

function showLoginScreen() {
    hideAllViews();
    const loginScreen = document.getElementById('login-screen');
    if (loginScreen) {
        loginScreen.classList.remove('hidden');
    }
}

function showRegistrationScreen() {
    hideAllViews();
    const registrationScreen = document.getElementById('registration-screen');
    if (registrationScreen) {
        registrationScreen.classList.remove('hidden');
    }
    if (pendingRegistration) {
        const display = document.getElementById('minecraft-username-display');
        if (display) {
            display.textContent = `🎮 Username: ${pendingRegistration.name}`;
        }
    }
}

function showStudentView() {
    hideAllViews();
    const studentView = document.getElementById('student-view');
    if (studentView) {
        studentView.classList.remove('hidden');
        updateStudentView();
    }
}

function showTeacherView() {
    hideAllViews();
    const teacherView = document.getElementById('teacher-view');
    if (teacherView) {
        teacherView.classList.remove('hidden');
        updateUI();
    }
}

function showAdminView() {
    hideAllViews();
    const adminView = document.getElementById('admin-view');
    if (adminView) {
        adminView.classList.remove('hidden');
        updateUI();
    }
}

function hideAllViews() {
    const views = [
        'login-screen',
        'registration-screen', 
        'student-view',
        'teacher-view',
        'admin-view'
    ];
    views.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.classList.add('hidden');
    });
}
function openQuickScoreModal(studentId) {
    const student = students.find(s => s.__backendId === studentId);
    if (!student) return;
    editingStudent = student;
    const teacherNameInput = document.getElementById('teacher-name-input');
    if (teacherNameInput) {
        teacherNameInput.value = '';
        teacherNameInput.style.borderColor = '';
        teacherNameInput.style.boxShadow = '';
        const errorDiv = document.getElementById('teacher-name-error');
        if (errorDiv) {
            errorDiv.remove();
        }
    }
    const reasonInput = document.getElementById('money-reason-input');
    if (reasonInput) {
        reasonInput.value = '';
        reasonInput.style.borderColor = '';
        reasonInput.style.boxShadow = '';
        const reasonErrorDiv = document.getElementById('money-reason-error');
        if (reasonErrorDiv) {
            reasonErrorDiv.remove();
        }
    }
    document.getElementById('quick-modal-title').textContent = `จัดการ: ${student.first_name} ${student.last_name}`;
    document.getElementById('quick-modal-subtitle').textContent = `🎮 ${student.minecraft_username} | 🏠 ${getHouseName(student.house)}`;
    const scoreElement = document.getElementById('quick-current-score');
    if (scoreElement) {
        scoreElement.textContent = student.score || 0;
        scoreElement.className = `text-2xl sm:text-3xl font-bold ${getScoreColor(student.score || 0)} mb-1`;
    }
    document.getElementById('quick-current-money').textContent = student.money_deducted || 0;
    const teacherSection = document.getElementById('teacher-money-section');
    const adminSection = document.getElementById('admin-money-section');
    if (userType === 'teacher') {
        if (teacherSection) teacherSection.classList.remove('hidden');
        if (adminSection) adminSection.classList.add('hidden');
    } else if (userType === 'admin') {
        if (teacherSection) teacherSection.classList.add('hidden');
        if (adminSection) adminSection.classList.remove('hidden');
    }
    document.getElementById('quick-score-modal').classList.remove('hidden');
    document.getElementById('quick-score-modal').classList.add('flex');
    if (teacherNameInput) {
        setTimeout(() => teacherNameInput.focus(), 100);
    }
}

function closeQuickScoreModal() {
    document.getElementById('quick-score-modal').classList.add('hidden');
    document.getElementById('quick-score-modal').classList.remove('flex');
    editingStudent = null;
}

function openSuperAdminModal() {
    document.getElementById('super-admin-modal').classList.remove('hidden');
    document.getElementById('super-admin-modal').classList.add('flex');
    document.getElementById('super-admin-password').value = '';
    hideError('super-admin-error');
}

function closeSuperAdminModal() {
    document.getElementById('super-admin-modal').classList.add('hidden');
    document.getElementById('super-admin-modal').classList.remove('flex');
}

function openDataManagementModal() {
    document.getElementById('data-management-modal').classList.remove('hidden');
    document.getElementById('data-management-modal').classList.add('flex');
    renderDataManagementList();
}

function closeDataManagementModal() {
    document.getElementById('data-management-modal').classList.add('hidden');
    document.getElementById('data-management-modal').classList.remove('flex');
}

function openBackupRestoreModal() {
    document.getElementById('backup-restore-modal').classList.remove('hidden');
    document.getElementById('backup-restore-modal').classList.add('flex');
    renderBackupHistory();
}

function closeBackupRestoreModal() {
    document.getElementById('backup-restore-modal').classList.add('hidden');
    document.getElementById('backup-restore-modal').classList.remove('flex');
}

function openTransactionHistoryModal(studentId = null) {
    const modal = document.getElementById('transaction-history-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (studentId) {
        const student = students.find(s => s.__backendId === studentId);
        if (student) {
            document.getElementById('transaction-history-subtitle').textContent = 
                `ประวัติของ ${student.first_name} ${student.last_name}`;
        }
    } else {
        document.getElementById('transaction-history-subtitle').textContent = 'ประวัติการทำรายการทั้งหมด';
    }
    renderTransactionHistory(studentId);
}

function closeTransactionHistoryModal() {
    document.getElementById('transaction-history-modal').classList.add('hidden');
    document.getElementById('transaction-history-modal').classList.remove('flex');
}

function openAdminTransactionModal() {
    document.getElementById('admin-transaction-modal').classList.remove('hidden');
    document.getElementById('admin-transaction-modal').classList.add('flex');
    renderAdminTransactionList();
    populateTeacherFilter();
}

function closeAdminTransactionModal() {
    document.getElementById('admin-transaction-modal').classList.add('hidden');
    document.getElementById('admin-transaction-modal').classList.remove('flex');
}

function openEditTransactionModal(transactionId) {
    const transaction = teacherTransactions.find(t => t.__backendId === transactionId);
    if (!transaction) return;
    editingDataRecord = transaction;
    const form = document.getElementById('edit-transaction-form');
    const editableFields = [
        { key: 'transaction_teacher', label: '👨‍🏫 อาจารย์ผู้ทำรายการ', type: 'text' },
        { key: 'transaction_amount', label: '💰 จำนวนเงิน/คะแนน', type: 'number' },
        { key: 'transaction_reason', label: '📝 เหตุผล', type: 'textarea' },
        { key: 'transaction_type', label: '⚙️ ประเภทรายการ', type: 'select', options: [
            { value: 'deduct', label: '🔻 หักเงิน' },
            { value: 'reduce', label: '🔺 ลดเงิน' },
            { value: 'reset', label: '♻️ รีเซ็ต' },
            { value: 'score_change', label: '✏️ เปลี่ยนคะแนน' }
        ]}
    ];
    form.innerHTML = editableFields.map(field => {
        if (field.type === 'textarea') {
            return securityUtils.html`
                <div class="mb-4">
                    <label for="edit-${field.key}" class="block text-sm font-medium text-slate-300 mb-2">
                        ${field.label}
                    </label>
                    <textarea id="edit-${field.key}" rows="3"
                           class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent text-white">${transaction[field.key] || ''}</textarea>
                </div>
            `;
        } else if (field.type === 'select') {
            return securityUtils.html`
                <div class="mb-4">
                    <label for="edit-${field.key}" class="block text-sm font-medium text-slate-300 mb-2">
                        ${field.label}
                    </label>
                    <select id="edit-${field.key}"
                           class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent text-white">
                        ${field.options.map(option => 
                            securityUtils.html`<option value="${option.value}" ${transaction[field.key] === option.value ? 'selected' : ''}>${option.label}</option>`
                        ).join('')}
                    </select>
                </div>
            `;
        } else {
            return securityUtils.html`
                <div class="mb-4">
                    <label for="edit-${field.key}" class="block text-sm font-medium text-slate-300 mb-2">
                        ${field.label}
                    </label>
                    <input type="${field.type}" id="edit-${field.key}" value="${transaction[field.key] || ''}"
                           class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent text-white">
                </div>
            `;
        }
    }).join('');
    form.innerHTML += securityUtils.html`
        <div class="mb-4 bg-slate-800/50 rounded-lg p-3">
            <h4 class="text-sm font-medium text-slate-300 mb-2">ข้อมูลอ้างอิง (ไม่สามารถแก้ไขได้)</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                    <span class="text-slate-400">นักศึกษา:</span>
                    <span class="text-white ml-2">${transaction.student_name}</span>
                </div>
                <div>
                    <span class="text-slate-400">Username:</span>
                    <span class="text-blue-400 ml-2">${transaction.student_username}</span>
                </div>
                <div>
                    <span class="text-slate-400">วันที่:</span>
                    <span class="text-white ml-2">${new Date(transaction.transaction_timestamp).toLocaleString('th-TH')}</span>
                </div>
                <div>
                    <span class="text-slate-400">Transaction ID:</span>
                    <span class="text-slate-500 ml-2 font-mono">${transaction.transaction_id}</span>
                </div>
            </div>
        </div>
    `;
    document.getElementById('edit-transaction-modal').classList.remove('hidden');
    document.getElementById('edit-transaction-modal').classList.add('flex');
}

function closeEditTransactionModal() {
    document.getElementById('edit-transaction-modal').classList.add('hidden');
    document.getElementById('edit-transaction-modal').classList.remove('flex');
    editingDataRecord = null;
}
async function quickAdjustScore(amount) {
    if (!editingStudent) return;
    const newScore = Math.max(0, (editingStudent.score || 0) + amount);
    const success = await updateStudentScore(editingStudent.__backendId, newScore);
    if (success) {
        const scoreElement = document.getElementById('quick-current-score');
        if (scoreElement) {
            scoreElement.textContent = newScore;
            scoreElement.className = `text-2xl sm:text-3xl font-bold ${getScoreColor(newScore)} mb-1`;
        }
    }
}

async function quickAdjustScoreCustom() {
    if (!editingStudent) return;
    const input = document.getElementById('quick-custom-score');
    const amount = parseInt(input.value);
    if (isNaN(amount)) return;
    const newScore = Math.max(0, (editingStudent.score || 0) + amount);
    const success = await updateStudentScore(editingStudent.__backendId, newScore);
    if (success) {
        const scoreElement = document.getElementById('quick-current-score');
        if (scoreElement) {
            scoreElement.textContent = newScore;
            scoreElement.className = `text-2xl sm:text-3xl font-bold ${getScoreColor(newScore)} mb-1`;
        }
        input.value = '';
    }
}

async function quickSetExactScore() {
    if (!editingStudent) return;
    const input = document.getElementById('quick-exact-score');
    const score = parseInt(input.value);
    if (isNaN(score) || score < 0) return;
    const success = await updateStudentScore(editingStudent.__backendId, score);
    if (success) {
        const scoreElement = document.getElementById('quick-current-score');
        if (scoreElement) {
            scoreElement.textContent = score;
            scoreElement.className = `text-2xl sm:text-3xl font-bold ${getScoreColor(score)} mb-1`;
        }
        input.value = '';
    }
}

async function quickAdjustMoneyTeacher(amount) {
    if (!editingStudent) return;
    const newAmount = Math.max(0, (editingStudent.money_deducted || 0) + amount);
    const success = await updateStudentMoney(editingStudent.__backendId, newAmount);
    if (success) {
        document.getElementById('quick-current-money').textContent = newAmount;
    }
}

async function quickAdjustMoneyCustomTeacher() {
    if (!editingStudent) return;
    const input = document.getElementById('quick-custom-money-teacher');
    const amount = parseInt(input.value);
    if (isNaN(amount) || amount <= 0) return;
    const newAmount = Math.max(0, (editingStudent.money_deducted || 0) + amount);
    const success = await updateStudentMoney(editingStudent.__backendId, newAmount);
    if (success) {
        document.getElementById('quick-current-money').textContent = newAmount;
        input.value = '';
    }
}

async function reduceMoneyDirectly(studentId, amount) {
    if (!editingStudent) return;
    const newAmount = Math.max(0, (editingStudent.money_deducted || 0) - amount);
    const success = await updateStudentMoney(editingStudent.__backendId, newAmount);
    if (success) {
        document.getElementById('quick-current-money').textContent = newAmount;
    }
}

async function resetMoneyToZero() {
    if (!editingStudent) return;
    const success = await updateStudentMoney(editingStudent.__backendId, 0);
    if (success) {
        document.getElementById('quick-current-money').textContent = 0;
    }
}

async function quickAdjustMoney(amount) {
    if (!editingStudent) return;
    const newAmount = Math.max(0, (editingStudent.money_deducted || 0) + amount);
    const success = await updateStudentMoney(editingStudent.__backendId, newAmount);
    if (success) {
        document.getElementById('quick-current-money').textContent = newAmount;
    }
}

async function quickAdjustMoneyCustom() {
    if (!editingStudent) return;
    const input = document.getElementById('quick-custom-money');
    const amount = parseInt(input.value);
    if (isNaN(amount)) return;
    const newAmount = Math.max(0, (editingStudent.money_deducted || 0) + amount);
    const success = await updateStudentMoney(editingStudent.__backendId, newAmount);
    if (success) {
        document.getElementById('quick-current-money').textContent = newAmount;
        input.value = '';
    }
}

async function quickSetExactMoney() {
    if (!editingStudent) return;
    const input = document.getElementById('quick-exact-money');
    const amount = parseInt(input.value);
    if (isNaN(amount) || amount < 0) return;
    const success = await updateStudentMoney(editingStudent.__backendId, amount);
    if (success) {
        document.getElementById('quick-current-money').textContent = amount;
        input.value = '';
    }
}

function openEditStudentModal(studentId) {
    const student = students.find(s => s.__backendId === studentId);
    if (!student) return;
    editingStudentData = student;
    const subtitleElement = document.getElementById('edit-student-subtitle');
    if (subtitleElement) {
        subtitleElement.textContent = `แก้ไขข้อมูล: ${student.first_name} ${student.last_name}`;
    }
    document.getElementById('edit-student-first-name').value = student.first_name || '';
    document.getElementById('edit-student-last-name').value = student.last_name || '';
    document.getElementById('edit-student-username').value = student.minecraft_username || '';
    const scoreInput = document.getElementById('edit-student-score');
    if (scoreInput) {
        scoreInput.value = student.score || 0;
        scoreInput.style.color = getScoreColorHex(student.score || 0);
    }
    const moneyInput = document.getElementById('edit-student-money');
    if (moneyInput) {
        moneyInput.value = student.money_deducted || 0;
    }

    const houseRadio = document.querySelector(`input[name="edit-house"][value="${student.house}"]`);
    if (houseRadio) {
        houseRadio.checked = true;
        document.querySelectorAll('.edit-house-option label > div').forEach(div => {
            div.classList.remove('border-purple-500', 'bg-purple-50/10');
            div.classList.add('border-transparent');
        });
        const selectedHouseDiv = houseRadio.closest('.edit-house-option').querySelector('label > div');
        selectedHouseDiv.classList.add('border-purple-500', 'bg-purple-50/10');
        selectedHouseDiv.classList.remove('border-transparent');
    }
    const roleRadio = document.querySelector(`input[name="edit-role"][value="${student.role}"]`);
    if (roleRadio) {
        roleRadio.checked = true;
        document.querySelectorAll('.edit-role-option label > div').forEach(div => {
            div.classList.remove('border-purple-500', 'bg-purple-50/10');
            div.classList.add('border-transparent');
        });
        const selectedRoleDiv = roleRadio.closest('.edit-role-option').querySelector('label > div');
        selectedRoleDiv.classList.add('border-purple-500', 'bg-purple-50/10');
        selectedRoleDiv.classList.remove('border-transparent');
    }
    document.getElementById('edit-student-player-type').textContent = 
        student.player_type === 'minecraft' ? '🎮 Minecraft Player' : '👤 Custom Player';
    document.getElementById('edit-student-id').textContent = student.id || '-';
    document.getElementById('edit-student-created').textContent = 
        student.created_at ? new Date(student.created_at).toLocaleString('th-TH') : '-';
    document.getElementById('edit-student-updated').textContent = 
        student.updated_at ? new Date(student.updated_at).toLocaleString('th-TH') : '-';
    document.getElementById('edit-student-modal').classList.remove('hidden');
    document.getElementById('edit-student-modal').classList.add('flex');
}

function closeEditStudentModal() {
    document.getElementById('edit-student-modal').classList.add('hidden');
    document.getElementById('edit-student-modal').classList.remove('flex');
    editingStudentData = null;
}
async function saveStudentEdit() {
    if (!editingStudentData) return;
    showLoading('save-student-button', 'save-student-loading');
    try {
        const firstName = document.getElementById('edit-student-first-name').value.trim();
        const lastName = document.getElementById('edit-student-last-name').value.trim();
        const username = document.getElementById('edit-student-username').value.trim();
        const score = parseInt(document.getElementById('edit-student-score').value) || 0;
        const money = parseInt(document.getElementById('edit-student-money').value) || 0;
        const house = document.querySelector('input[name="edit-house"]:checked')?.value;
        const role = document.querySelector('input[name="edit-role"]:checked')?.value;
        if (!firstName || !lastName || !username || !house || !role) {
            return;
        }
        const usernameCheck = validateUsername(username, editingStudentData.__backendId);
        if (!usernameCheck.valid) {
            showError('edit-student-error', usernameCheck.message);
            return;
        }
        updateDataStatus('syncing');
        const oldScore = editingStudentData.score || 0;
        const oldMoney = editingStudentData.money_deducted || 0;
        const oldUsername = editingStudentData.minecraft_username;
        const oldHouse = editingStudentData.house;
        const oldRole = editingStudentData.role;
        const updatedStudent = {
            ...editingStudentData,
            first_name: firstName,
            last_name: lastName,
            minecraft_username: username,
            house: house,
            role: role,
            score: score,
            money_deducted: money,
            updated_at: new Date().toISOString()
        };
                if (window.dataSdk) {
                    const record = withCollection(updatedStudent, "students");
                    const result = await window.dataSdk.update(record);
            if (result.isOk) {
                const changes = [];
                if (oldScore !== score) {
                    changes.push(`คะแนน: ${oldScore}  ${score}`);
                    await recordTransaction(
                        editingStudentData.__backendId,
                        'score_change',
                        score - oldScore,
                        `Admin แก้ไขคะแนนจาก ${oldScore} เป็น ${score}`,
                        'admin'
                    );
                }
                if (oldMoney !== money) {
                    changes.push(`เงินที่ถูกหัก: ${oldMoney}  ${money}`);
                    const transactionType = money > oldMoney ? 'deduct' : 'reduce';
                    await recordTransaction(
                        editingStudentData.__backendId,
                        transactionType,
                        Math.abs(money - oldMoney),
                        `Admin แก้ไขเงินที่ถูกหักจาก ${oldMoney} เป็น ${money}`,
                        'admin'
                    );
                }
                if (oldUsername !== username) {
                    changes.push(`Username: ${oldUsername}  ${username}`);
                }
                if (oldHouse !== house) {
                    changes.push(`บ้าน: ${getHouseName(oldHouse)}  ${getHouseName(house)}`);
                }
                if (oldRole !== role) {
                    changes.push(`บทบาท: ${getRoleName(oldRole)}  ${getRoleName(role)}`);
                }
                if (changes.length > 0) {
                    await recordTransaction(
                        editingStudentData.__backendId,
                        'edit',
                        0,
                        `Admin แก้ไขข้อมูล: ${changes.join(', ')}`,
                        'admin'
                    );
                }
                closeEditStudentModal();
                updateDataStatus('synced');
            } else {
                updateDataStatus('error');
            }
        }
    } catch (error) {
        console.error('Error saving student edit:', error);
        updateDataStatus('error');
    } finally {
        hideLoading('save-student-button', 'save-student-loading');
    }
}

async function confirmDeleteStudent(studentId) {
    const student = students.find(s => s.__backendId === studentId);
    if (!student) return;
    const deleteCell = event.target.closest('td');
    deleteCell.innerHTML = securityUtils.html`
        <div class="flex gap-2">
            <button onclick="executeDeleteStudent('${studentId}')" 
                    class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs transition-colors">
                ยืนยันลบ
            </button>
            <button onclick="cancelDeleteStudent('${studentId}')" 
                    class="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-xs transition-colors">
                ยกเลิก
            </button>
        </div>
    `;
}

async function executeDeleteStudent(studentId) {
    showPageLoader('กำลังลบข้อมูล...');
    try {
        const success = await deleteStudent(studentId);
        if (success) {
        } else {
            updateStudentsList();
        }
    } finally {
        hidePageLoader();
    }
}

function cancelDeleteStudent() {
    updateStudentsList();
}

async function addStudentManually(formData) {
    try {
        if (allRecords.length >= 999) {
            return { success: false, message: 'ระบบเต็ม ไม่สามารถเพิ่มนักศึกษาได้' };
        }
        const usernameCheck = validateUsername(formData.username);
        if (!usernameCheck.valid) {
            return { success: false, message: usernameCheck.message };
        }
        updateDataStatus('syncing');
        const studentData = {
            id: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            minecraft_username: formData.username,
            first_name: formData.firstName,
            last_name: formData.lastName,
            house: formData.house,
            role: formData.role,
            score: 0,
            money_deducted: 0,
            player_type: 'custom',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
                if (window.dataSdk) {
                    const record = withCollection(studentData, "students");
                    const result = await window.dataSdk.create(record);
            if (result.isOk) {
                updateDataStatus('synced');
                return { success: true, message: 'เพิ่มนักศึกษาสำเร็จ' };
            } else {
                updateDataStatus('error');
                return { success: false, message: 'เกิดข้อผิดพลาดในการเพิ่มข้อมูล' };
            }
        } else {
            updateDataStatus('error');
            return { success: false, message: 'ระบบไม่พร้อมใช้งาน' };
        }
    } catch (error) {
        console.error('Error adding student manually:', error);
        updateDataStatus('error');
        return { success: false, message: 'เกิดข้อผิดพลาดในการเพิ่มนักศึกษา' };
    }
}

function viewStudentTransactionHistory() {
    if (!editingStudent) return;
    openTransactionHistoryModal(editingStudent.__backendId);
}
function renderAdminTransactionList() {
    const container = document.getElementById('admin-transaction-list');
    const emptyState = document.getElementById('admin-transaction-empty');
    const typeFilter = document.getElementById('admin-transaction-type-filter').value;
    const teacherFilter = document.getElementById('admin-transaction-teacher-filter').value;
    const searchTerm = document.getElementById('admin-transaction-search').value.toLowerCase();
    let filteredTransactions = [...teacherTransactions];
    if (typeFilter) {
        filteredTransactions = filteredTransactions.filter(t => t.transaction_type === typeFilter);
    }
    if (teacherFilter) {
        filteredTransactions = filteredTransactions.filter(t => t.transaction_teacher === teacherFilter);
    }
    if (searchTerm) {
        filteredTransactions = filteredTransactions.filter(t => 
            t.student_name.toLowerCase().includes(searchTerm) ||
            t.student_username.toLowerCase().includes(searchTerm) ||
            t.transaction_reason.toLowerCase().includes(searchTerm)
        );
    }
    updateAdminTransactionStats(filteredTransactions);
    if (filteredTransactions.length === 0) {
        container.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }
    emptyState.classList.add('hidden');
    const sortedTransactions = filteredTransactions.sort((a, b) => 
        new Date(b.transaction_timestamp) - new Date(a.transaction_timestamp)
    );
    container.innerHTML = sortedTransactions.map(transaction => {
        const date = new Date(transaction.transaction_timestamp).toLocaleString('th-TH');
        const typeClass = getTransactionTypeClass(transaction.transaction_type);
        const typeIcon = getTransactionTypeIcon(transaction.transaction_type);
        return securityUtils.html`
            <div class="transaction-item ${typeClass} relative">
                <div class="flex justify-between items-start mb-3">
                    <div class="flex items-center">
                        <span class="text-2xl mr-3">${typeIcon}</span>
                        <div>
                            <h4 class="font-semibold text-white text-lg">${transaction.student_name}</h4>
                            <p class="text-sm text-slate-400">@${transaction.student_username}</p>
                            <p class="text-xs text-slate-500 mt-1">ID: ${transaction.transaction_id}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-xl font-bold ${getTransactionAmountColor(transaction.transaction_type)} mb-1">
                            ${getTransactionAmountText(transaction.transaction_type, transaction.transaction_amount)}
                        </div>
                        <div class="text-xs text-slate-400">${date}</div>
                        <div class="text-xs text-slate-500 mt-1">
                            โดย: ${transaction.transaction_teacher}
                        </div>
                    </div>
                </div>
                <div class="text-sm text-slate-300 mb-3 bg-slate-800/30 rounded p-2">
                    <strong>เหตุผล:</strong> ${transaction.transaction_reason}
                </div>
                <div class="flex justify-between items-center">
                    <div class="text-xs text-slate-400">
                        <span class="inline-flex items-center">
                            <span class="w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
                            Admin Management
                        </span>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="openEditTransactionModal('${transaction.__backendId}')" 
                                class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs transition-colors flex items-center gap-1">
                            ✏️ แก้ไข
                        </button>
                        <button onclick="confirmDeleteTransaction('${transaction.__backendId}')" 
                                class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs transition-colors flex items-center gap-1">
                            🗑️ ลบ
                        </button>
                        <button onclick="duplicateTransaction('${transaction.__backendId}')" 
                                class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs transition-colors flex items-center gap-1">
                            📄 คัดลอก
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function updateAdminTransactionStats(transactions) {
    const stats = {
        total: transactions.length,
        deductions: transactions.filter(t => t.transaction_type === 'deduct').length,
        reductions: transactions.filter(t => t.transaction_type === 'reduce').length,
        scoreChanges: transactions.filter(t => t.transaction_type === 'score_change').length
    };
    document.getElementById('admin-total-transactions').textContent = stats.total;
    document.getElementById('admin-total-deductions').textContent = stats.deductions;
    document.getElementById('admin-total-reductions').textContent = stats.reductions;
    document.getElementById('admin-total-score-changes').textContent = stats.scoreChanges;
}

function populateTeacherFilter() {
    const select = document.getElementById('admin-transaction-teacher-filter');
    const teachers = [...new Set(teacherTransactions.map(t => t.transaction_teacher))].sort();
    select.innerHTML = '<option value="">ทั้งหมด</option>';
    teachers.forEach(teacher => {
        const option = document.createElement('option');
        option.value = teacher;
        option.textContent = teacher;
        select.appendChild(option);
    });
}

async function confirmDeleteTransaction(transactionId) {
    const transaction = teacherTransactions.find(t => t.__backendId === transactionId);
    if (!transaction) return;
    const button = event.target;
    const originalText = button.innerHTML;
    button.innerHTML = '⚠️ ยืนยัน?';
    button.onclick = async () => {
        try {
            if (window.dataSdk) {
                        const record = withCollection(transaction, "transactions");
                        const result = await window.dataSdk.delete(record);
                if (result.isOk) {
                    renderAdminTransactionList();
                }
            }
        } catch (error) {
            console.error('Error deleting transaction:', error);
        }
    };
    setTimeout(() => {
        button.innerHTML = originalText;
        button.onclick = () => confirmDeleteTransaction(transactionId);
    }, 3000);
}

async function duplicateTransaction(transactionId) {
    const transaction = teacherTransactions.find(t => t.__backendId === transactionId);
    if (!transaction) return;
    try {
        if (allRecords.length >= 999) {
            return;
        }
        const duplicatedTransaction = {
            ...transaction,
            transaction_id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            transaction_timestamp: new Date().toISOString(),
            transaction_reason: `[คัดลอก] ${transaction.transaction_reason}`,
            created_at: new Date().toISOString()
        };
        delete duplicatedTransaction.__backendId;
        if (window.dataSdk) {
                const record = withCollection(duplicatedTransaction, "transactions");
                const result = await window.dataSdk.create(record);
            if (result.isOk) {
                renderAdminTransactionList();
            }
        }
    } catch (error) {
        console.error('Error duplicating transaction:', error);
    }
}

async function saveTransactionEdit() {
    if (!editingDataRecord) return;
    showLoading('save-transaction-button', 'save-transaction-loading');
    try {
        const form = document.getElementById('edit-transaction-form');
        const inputs = form.querySelectorAll('input, textarea, select');
        const updatedTransaction = { ...editingDataRecord };
        inputs.forEach(input => {
            const field = input.id.replace('edit-', '');
            if (input.type === 'number') {
                updatedTransaction[field] = parseInt(input.value) || 0;
            } else {
                updatedTransaction[field] = input.value;
            }
        });
        updatedTransaction.updated_at = new Date().toISOString();
        if (window.dataSdk) {
                const record = withCollection(updatedTransaction, "transactions");
                const result = await window.dataSdk.update(record);
            if (result.isOk) {
                closeEditTransactionModal();
                renderAdminTransactionList();
            }
        }
    } catch (error) {
        console.error('Error saving transaction:', error);
    } finally {
        hideLoading('save-transaction-button', 'save-transaction-loading');
    }
}
function renderTransactionHistory(studentId = null) {
    const container = document.getElementById('transaction-history-list');
    const emptyState = document.getElementById('transaction-history-empty');
    let transactions = teacherTransactions;
    if (studentId) {
        transactions = teacherTransactions.filter(t => t.student_id === studentId);
    }
    if (transactions.length === 0) {
        container.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }
    emptyState.classList.add('hidden');
    const sortedTransactions = [...transactions].sort((a, b) => 
        new Date(b.transaction_timestamp) - new Date(a.transaction_timestamp)
    );
    container.innerHTML = sortedTransactions.map(transaction => {
        const date = new Date(transaction.transaction_timestamp).toLocaleString('th-TH');
        const typeClass = getTransactionTypeClass(transaction.transaction_type);
        const typeIcon = getTransactionTypeIcon(transaction.transaction_type);
        return securityUtils.html`
            <div class="transaction-item ${typeClass}">
                <div class="flex justify-between items-start mb-2">
                    <div class="flex items-center">
                        <span class="text-lg mr-2">${typeIcon}</span>
                        <div>
                            <h4 class="font-semibold text-white">${transaction.student_name}</h4>
                            <p class="text-sm text-slate-400">@${transaction.student_username}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-lg font-bold ${getTransactionAmountColor(transaction.transaction_type)}">
                            ${getTransactionAmountText(transaction.transaction_type, transaction.transaction_amount)}
                        </div>
                        <div class="text-xs text-slate-400">${date}</div>
                    </div>
                </div>
                <div class="text-sm text-slate-300 mb-2">
                    ${transaction.transaction_reason}
                </div>
                <div class="flex justify-between items-center text-xs text-slate-400">
                    <span>โดย: ${transaction.transaction_teacher === 'teacher' ? 'อาจารย์' : 'Admin'}</span>
                    <span>ID: ${transaction.transaction_id}</span>
                </div>
            </div>
        `;
    }).join('');
}

function getTransactionTypeClass(type) {
    const classes = {
        'deduct': 'transaction-deduct',
        'reduce': 'transaction-reduce', 
        'reset': 'transaction-reset',
        'score_change': 'transaction-deduct'
    };
    return classes[type] || 'transaction-deduct';
}

function getTransactionTypeIcon(type) {
    const icons = {
        'deduct': '??',
        'reduce': '??',
        'reset': '??',
        'score_change': '??'
    };
    return icons[type] || '??';
}

function getTransactionAmountColor(type) {
    const colors = {
        'deduct': 'text-red-400',
        'reduce': 'text-green-400',
        'reset': 'text-yellow-400',
        'score_change': 'text-blue-400'
    };
    return colors[type] || 'text-slate-400';
}

function getTransactionAmountText(type, amount) {
    switch (type) {
        case 'deduct':
            return `+${amount}฿`;
        case 'reduce':
            return `-${amount}฿`;
        case 'reset':
            return '0฿';
        case 'score_change':
            return amount > 0 ? `+${amount}` : `${amount}`;
        default:
            return `${amount}`;
    }
}

function renderDataManagementList() {
    const container = document.getElementById('data-management-list');
    const emptyState = document.getElementById('data-management-empty');
    if (allRecords.length === 0) {
        container.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }
    emptyState.classList.add('hidden');
    const typeFilter = document.getElementById('data-type-filter').value;
    const searchTerm = document.getElementById('data-search').value.toLowerCase();
    let filteredRecords = allRecords;
    if (typeFilter) {
        filteredRecords = filteredRecords.filter(record => {
            switch (typeFilter) {
                case 'student':
                    return record.minecraft_username && record.first_name && !record.transaction_type;
                case 'transaction':
                    return record.transaction_type;
                case 'backup':
                    return record.backup_id || record.refund_id;
                default:
                    return true;
            }
        });
    }
    if (searchTerm) {
        filteredRecords = filteredRecords.filter(record => 
            JSON.stringify(record).toLowerCase().includes(searchTerm)
        );
    }
    container.innerHTML = filteredRecords.map(record => {
        const recordType = getRecordType(record);
        const recordIcon = getRecordIcon(recordType);
        return securityUtils.html`
            <div class="bg-slate-700 rounded-lg p-4 border border-slate-600">
                <div class="flex justify-between items-start mb-3">
                    <div class="flex items-center">
                        <span class="text-2xl mr-3">${recordIcon}</span>
                        <div>
                            <h4 class="font-semibold text-white">${getRecordTitle(record)}</h4>
                            <p class="text-sm text-slate-400">${recordType}</p>
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="editDataRecord('${record.__backendId}')" 
                                class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs transition-colors">
                            แก้ไข
                        </button>
                        <button onclick="deleteDataRecord('${record.__backendId}')" 
                                class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs transition-colors">
                            ลบ
                        </button>
                    </div>
                </div>
                <div class="text-xs text-slate-400 bg-slate-800 rounded p-2 font-mono">
                    <pre>${JSON.stringify(record, null, 2)}</pre>
                </div>
            </div>
        `;
    }).join('');
}

function getRecordType(record) {
    if (record.minecraft_username && record.first_name && !record.transaction_type) {
        return 'ข้อมูลนักศึกษา';
    }
    if (record.transaction_type) {
        return 'ประวัติการทำรายการ';
    }
    if (record.refund_id) {
        return 'ประวัติการคืนเงิน';
    }
    return 'ข้อมูลอื่นๆ';
}

function getRecordIcon(type) {
    const icons = {
        'ข้อมูลนักศึกษา': '??',
        'ประวัติการทำรายการ': '??',
        'ประวัติการคืนเงิน': '??',
        'ข้อมูลอื่นๆ': '??'
    };
    return icons[type] || '??';
}

function getRecordTitle(record) {
    if (record.first_name && record.last_name) {
        return `${record.first_name} ${record.last_name}`;
    }
    if (record.transaction_type) {
        return `รายการ: ${record.student_name || 'ไม่ระบุ'}`;
    }
    if (record.refund_id) {
        return `คืนเงิน: ${record.student_name || 'ไม่ระบุ'}`;
    }
    return record.__backendId || 'ไม่ระบุ';
}
async function editDataRecord(recordId) {
    const record = allRecords.find(r => r.__backendId === recordId);
    if (!record) return;
    editingDataRecord = record;
    const modal = document.getElementById('edit-data-modal');
    const form = document.getElementById('edit-data-form');
    const fields = Object.keys(record).filter(key => key !== '__backendId');
    form.innerHTML = fields.map(field => securityUtils.html`
        <div class="mb-4">
            <label for="edit-${field}" class="block text-sm font-medium text-slate-300 mb-2">
                ${field}
            </label>
            <input type="text" id="edit-${field}" value="${record[field] || ''}"
                   class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white">
        </div>
    `).join('');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

async function saveDataRecord() {
    if (!editingDataRecord) return;
    showLoading('save-data-button', 'save-data-loading');
    try {
        const form = document.getElementById('edit-data-form');
        const inputs = form.querySelectorAll('input');
        const updatedRecord = { ...editingDataRecord };
        inputs.forEach(input => {
            const field = input.id.replace('edit-', '');
            updatedRecord[field] = input.value;
        });
        updatedRecord.updated_at = new Date().toISOString();
        if (window.dataSdk) {
                const recordWithCollection = withCollection(updatedRecord);
                const result = await window.dataSdk.update(recordWithCollection);
            if (result.isOk) {
                closeEditDataModal();
                renderDataManagementList();
            }
        }
    } catch (error) {
        console.error('Error saving record:', error);
    } finally {
        hideLoading('save-data-button', 'save-data-loading');
    }
}

async function deleteDataRecord(recordId) {
    const record = allRecords.find(r => r.__backendId === recordId);
    if (!record) return;
    const button = event.target;
    const originalText = button.textContent;
    button.textContent = 'ยืนยัน?';
    button.onclick = async () => {
        try {
            if (window.dataSdk) {
                const recordWithCollection = withCollection(record);
                const result = await window.dataSdk.delete(recordWithCollection);
                if (result.isOk) {
                    renderDataManagementList();
                }
            }
        } catch (error) {
            console.error('Error deleting record:', error);
        }
    };
    setTimeout(() => {
        button.textContent = originalText;
        button.onclick = () => deleteDataRecord(recordId);
    }, 3000);
}

function closeEditDataModal() {
    document.getElementById('edit-data-modal').classList.add('hidden');
    document.getElementById('edit-data-modal').classList.remove('flex');
    editingDataRecord = null;
}

function renderBackupHistory() {
    const container = document.getElementById('backup-history-list');
    const emptyState = document.getElementById('backup-history-empty');
    if (backupHistory.length === 0) {
        container.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }
    emptyState.classList.add('hidden');
    container.innerHTML = backupHistory.map(backup => {
        const date = new Date(backup.timestamp).toLocaleString('th-TH');
        return securityUtils.html`
            <div class="bg-slate-700 rounded-lg p-4 border border-slate-600">
                <div class="flex justify-between items-center">
                    <div>
                        <h4 class="font-semibold text-white">${backup.type}</h4>
                        <p class="text-sm text-slate-400">${date}</p>
                        <p class="text-xs text-slate-500">${backup.recordCount} รายการ</p>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="downloadBackup('${backup.id}')" 
                                class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs transition-colors">
                            ดาวน์โหลด
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function createFullBackup() {
    const success = await exportAllData();
    if (success) {
        renderBackupHistory();
    }
}

async function createStudentsBackup() {
    try {
        const exportData = {
            students: students,
            metadata: {
                exportDate: new Date().toISOString(),
                totalStudents: students.length,
                version: '1.0',
                type: 'students_only'
            }
        };
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `students_backup_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        const backup = {
            id: `backup_students_${Date.now()}`,
            type: 'students_only',
            timestamp: new Date().toISOString(),
            recordCount: students.length
        };
        backupHistory.push(backup);
        renderBackupHistory();
        return true;
    } catch (error) {
        console.error('Error creating students backup:', error);
        return false;
    }
}

async function restoreData() {
    const fileInput = document.getElementById('restore-file-input');
    const file = fileInput.files[0];
    if (!file) {
        return;
    }
    showLoading('restore-data-button', 'restore-loading');
    try {
        const success = await importData(file);
        if (success) {
            fileInput.value = '';
        }
    } catch (error) {
        console.error('Error restoring data:', error);
    } finally {
        hideLoading('restore-data-button', 'restore-loading');
    }
}
document.addEventListener('DOMContentLoaded', function() {
    initializeDataSDK();
    initializeElementSDK();

    document.getElementById('student-login-form')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        hideError('login-error');
        const username = document.getElementById('student-login-name').value.trim();
        if (!username) return;
        showLoading('student-login-button', 'student-login-loading');
        try {
            handleStudentLogin(username);
        } finally {
            hideLoading('student-login-button', 'student-login-loading');
        }
    });

    document.getElementById('admin-login-form')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        hideError('login-error');
        const passwordInput = document.getElementById('admin-password');
        const password = passwordInput.value;
        if (!password) return;
        showLoading('admin-login-button', 'admin-login-loading');
        try {
            await handleTeacherLogin(password);
        } finally {
            hideLoading('admin-login-button', 'admin-login-loading');
            passwordInput.value = '';
        }
    });

    document.getElementById('registration-form')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        hideError('registration-error');
        const formData = {
            firstName: document.getElementById('first-name').value.trim(),
            lastName: document.getElementById('last-name').value.trim(),
            house: document.querySelector('input[name="house"]:checked')?.value
        };
        if (!formData.firstName || !formData.lastName || !formData.house) {
            showError('registration-error', 'กรุณากรอกข้อมูลให้ครบถ้วน');
            return;
        }
        showLoading('register-button', 'register-loading');
        try {
            await registerStudent(formData);
        } finally {
            hideLoading('register-button', 'register-loading');
        }
    });

    document.getElementById('super-admin-form')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        hideError('super-admin-error');
        const passwordInput = document.getElementById('super-admin-password');
        const password = passwordInput.value;
        if (!password) return;
        showLoading('super-admin-login-submit', 'super-admin-loading');
        try {
            await handleSuperAdminLogin(password);
        } finally {
            hideLoading('super-admin-login-submit', 'super-admin-loading');
            passwordInput.value = '';
        }
    });

    document.getElementById('admin-manual-add-form')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        const formData = {
            firstName: document.getElementById('admin-manual-first-name').value.trim(),
            lastName: document.getElementById('admin-manual-last-name').value.trim(),
            username: document.getElementById('admin-manual-minecraft').value.trim(),
            house: document.getElementById('admin-manual-house').value,
            role: document.getElementById('admin-manual-role').value
        };
        if (!formData.firstName || !formData.lastName || !formData.username || !formData.house || !formData.role) {
            return;
        }
        showLoading('admin-manual-add-button', 'admin-manual-add-loading');
        try {
            const result = await addStudentManually(formData);
            if (result.success) {
                document.getElementById('admin-manual-add-form').reset();
            }
        } finally {
            hideLoading('admin-manual-add-button', 'admin-manual-add-loading');
        }
    });

    document.getElementById('student-tab')?.addEventListener('click', function() {
        document.getElementById('student-tab').className = 'btn-responsive rounded-lg font-medium transition-all bg-blue-600 text-white shadow-sm font-semibold touch-friendly hover:bg-blue-700';
        document.getElementById('admin-tab').className = 'btn-responsive rounded-lg font-medium transition-all text-gray-600 hover:text-gray-800 hover:bg-gray-100 touch-friendly';
        document.getElementById('student-login-form').classList.remove('hidden');
        document.getElementById('admin-login-form').classList.add('hidden');
    });

    document.getElementById('admin-tab')?.addEventListener('click', function() {
        document.getElementById('admin-tab').className = 'btn-responsive rounded-lg font-medium transition-all bg-blue-600 text-white shadow-sm font-semibold touch-friendly hover:bg-blue-700';
        document.getElementById('student-tab').className = 'btn-responsive rounded-lg font-medium transition-all text-gray-600 hover:text-gray-800 hover:bg-gray-100 touch-friendly';
        document.getElementById('admin-login-form').classList.remove('hidden');
        document.getElementById('student-login-form').classList.add('hidden');
    });

    document.querySelectorAll('.house-option').forEach(option => {
        option.addEventListener('click', function() {
            document.querySelectorAll('.house-option label > div').forEach(div => {
                div.classList.remove('border-blue-500', 'bg-blue-50');
                div.classList.add('border-transparent');
            });
            const label = this.querySelector('label > div');
            label.classList.add('border-blue-500', 'bg-blue-50');
            label.classList.remove('border-transparent');
        });
    });

    document.getElementById('back-to-login')?.addEventListener('click', showLoginScreen);
    document.getElementById('student-logout-button')?.addEventListener('click', logout);
    document.getElementById('teacher-logout-button')?.addEventListener('click', logout);
    document.getElementById('admin-logout-button')?.addEventListener('click', logout);
    document.getElementById('super-admin-login-button')?.addEventListener('click', openSuperAdminModal);
    document.getElementById('cancel-super-admin')?.addEventListener('click', closeSuperAdminModal);
    document.getElementById('cancel-edit-data')?.addEventListener('click', closeEditDataModal);
    document.getElementById('save-data-button')?.addEventListener('click', saveDataRecord);

    document.getElementById('view-all-transactions-button')?.addEventListener('click', () => openTransactionHistoryModal());
    document.getElementById('admin-view-all-data-button')?.addEventListener('click', openDataManagementModal);
    document.getElementById('teacher-backup-button')?.addEventListener('click', openBackupRestoreModal);
    document.getElementById('admin-backup-button')?.addEventListener('click', openBackupRestoreModal);
    document.getElementById('export-data-button')?.addEventListener('click', exportAllData);
    document.getElementById('admin-export-data-button')?.addEventListener('click', exportAllData);
    document.getElementById('create-full-backup')?.addEventListener('click', createFullBackup);
    document.getElementById('create-students-backup')?.addEventListener('click', createStudentsBackup);
    document.getElementById('restore-data-button')?.addEventListener('click', restoreData);

    document.getElementById('data-type-filter')?.addEventListener('change', renderDataManagementList);
    document.getElementById('data-search')?.addEventListener('input', renderDataManagementList);
    document.getElementById('refresh-data-list')?.addEventListener('click', renderDataManagementList);

    document.getElementById('teacher-refresh-data-button')?.addEventListener('click', () => {
        updateDataStatus('syncing');
        setTimeout(() => updateDataStatus('synced'), 1000);
    });
    document.getElementById('admin-refresh-data-button')?.addEventListener('click', () => {
        updateDataStatus('syncing');
        setTimeout(() => updateDataStatus('synced'), 1000);
    });

    document.getElementById('show-all-transactions-admin-button')?.addEventListener('click', openAdminTransactionModal);
    document.getElementById('show-teacher-transactions-button')?.addEventListener('click', () => openTransactionHistoryModal());
    document.getElementById('show-refund-history-button')?.addEventListener('click', () => openTransactionHistoryModal());

    document.getElementById('cancel-edit-transaction')?.addEventListener('click', closeEditTransactionModal);
    document.getElementById('save-transaction-button')?.addEventListener('click', saveTransactionEdit);

    document.getElementById('admin-transaction-type-filter')?.addEventListener('change', renderAdminTransactionList);
    document.getElementById('admin-transaction-teacher-filter')?.addEventListener('change', renderAdminTransactionList);
    document.getElementById('admin-transaction-search')?.addEventListener('input', renderAdminTransactionList);
    document.getElementById('refresh-admin-transactions')?.addEventListener('click', renderAdminTransactionList);

    document.getElementById('edit-student-form')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        await saveStudentEdit();
    });

    document.querySelectorAll('.edit-house-option').forEach(option => {
        option.addEventListener('click', function() {
            document.querySelectorAll('.edit-house-option label > div').forEach(div => {
                div.classList.remove('border-purple-500', 'bg-purple-50/10');
                div.classList.add('border-transparent');
            });
            const label = this.querySelector('label > div');
            label.classList.add('border-purple-500', 'bg-purple-50/10');
            label.classList.remove('border-transparent');
        });
    });

    document.querySelectorAll('.edit-role-option').forEach(option => {
        option.addEventListener('click', function() {
            document.querySelectorAll('.edit-role-option label > div').forEach(div => {
                div.classList.remove('border-purple-500', 'bg-purple-50/10');
                div.classList.add('border-transparent');
            });
            const label = this.querySelector('label > div');
            label.classList.add('border-purple-500', 'bg-purple-50/10');
            label.classList.remove('border-transparent');
        });
    });

    document.getElementById('admin-clear-data-button')?.addEventListener('click', async function() {
        const button = this;
        const originalText = button.textContent;
        button.textContent = '⚠️ ยืนยันล้างข้อมูล?';
        button.onclick = async () => {
            console.log('Clear data functionality requires careful implementation');
        };
        setTimeout(() => {
            button.textContent = originalText;
            button.onclick = arguments.callee;
        }, 5000);
    });

    document.getElementById('edit-student-score')?.addEventListener('input', function() {
        const score = parseInt(this.value) || 0;
        this.style.color = getScoreColorHex(score);
    });

    document.getElementById('quick-custom-score')?.addEventListener('input', function() {
        if (editingStudent) {
            const amount = parseInt(this.value) || 0;
            const newScore = Math.max(0, (editingStudent.score || 0) + amount);
            this.style.color = getScoreColorHex(newScore);
        }
    });

    document.getElementById('quick-exact-score')?.addEventListener('input', function() {
        const score = parseInt(this.value) || 0;
        this.style.color = getScoreColorHex(score);
    });
});

function logout() {
    isLoggedIn = false;
    userType = null;
    currentStudent = null;
    editingStudent = null;
    pendingRegistration = null;

    const loginScreen = document.getElementById('login-screen');
    const superAdminModal = document.getElementById('super-admin-modal');

    if (loginScreen) {
        showLoginScreen();
    } else if (superAdminModal) {
        hideAllViews();
        openSuperAdminModal();
    }
}

(function initialEntry() {
    const loginScreen = document.getElementById('login-screen');
    const superAdminModal = document.getElementById('super-admin-modal');

    if (loginScreen) {
        showLoginScreen();
    } else if (superAdminModal) {
        openSuperAdminModal();
    }
})();


