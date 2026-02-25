(function () {
	/*
	 * Social Stream Ninja Source Template
	 *
	 * Purpose:
	 * - A configurable starter based on common patterns across existing sources/*.js integrations.
	 * - Keep per-site changes in one CONFIG block instead of scattered line edits.
	 *
	 * How to use:
	 * 1) Copy this file to sources/<yoursite>.js
	 * 2) Update CONFIG values only first
	 * 3) Update parseMessageNode() only if selector-only config isn't enough
	 * 4) Add manifest.json matches + content_script mapping
	 */

	//////////////////////////////
	// 1) Site-level configuration
	//////////////////////////////
	const CONFIG = {
		// Must be unique and match your source filename/intended source id
		SOURCE_TYPE: "template",

		// Polling fallback interval; many sources use 500-2000ms
		POLL_INTERVAL_MS: 500,

		// Where messages live (container and rows)
		MESSAGE_CONTAINER_SELECTOR: "#chat",
		MESSAGE_ROW_SELECTOR: ".message",

		// Skip/marking behavior
		PROCESSED_ATTR: "data-ss-processed",

		// Chat data selectors (can be arrays for fallback)
		SELECTORS: {
			name: [".message-info-name", ".chatUsername", "[data-username]"],
			message: [".message-content", ".chatMessage", "[data-message]"],
			avatar: ["img.avatar", ".message img[src]"],
			focusInput: ["#chatinput", "textarea", "input[type='text']", "[contenteditable='true']"]
		},

		// Optional fixed values per integration
		DEFAULTS: {
			chatbadges: "",
			backgroundColor: "",
			textColor: "",
			nameColor: "",
			hasDonation: "",
			membership: "",
			contentimg: ""
		}
	};

	//////////////////////////////
	// 2) Runtime state
	//////////////////////////////
	let settings = {};
	let isExtensionOn = true;
	let pollTimer = null;
	const seenMessageKeys = new Set();

	//////////////////////////////
	// 3) Generic utility helpers
	//////////////////////////////
	function escapeHtml(unsafe) {
		try {
			if (!unsafe) { return ""; }
			if (settings.textonlymode) { return unsafe; }
			return (unsafe + "")
				.replace(/&/g, "&amp;")
				.replace(/</g, "&lt;")
				.replace(/>/g, "&gt;")
				.replace(/\"/g, "&quot;")
				.replace(/'/g, "&#039;");
		} catch (e) {
			return "";
		}
	}

	function getFirstBySelectors(scope, selectors = []) {
		if (!scope || !selectors || !selectors.length) { return null; }
		for (const selector of selectors) {
			try {
				const found = scope.querySelector(selector);
				if (found) { return found; }
			} catch (e) {}
		}
		return null;
	}

	function getAllContentNodes(element) {
		let resp = "";
		if (!element) { return resp; }

		if (!element.childNodes || !element.childNodes.length) {
			return element.textContent ? escapeHtml(element.textContent) : "";
		}

		element.childNodes.forEach(node => {
			if (node.childNodes && node.childNodes.length) {
				resp += getAllContentNodes(node);
			} else if (node.nodeType === 3 && node.textContent && node.textContent.trim()) {
				resp += escapeHtml(node.textContent);
			} else if (node.nodeType === 1) {
				if (!settings.textonlymode) {
					if (node.nodeName === "IMG" && node.src) {
						node.src = node.src + "";
					}
					resp += node.outerHTML;
				} else if (node.nodeName === "BR") {
					resp += "\n";
				}
			}
		});

		return resp.trim();
	}

	function trimSeenSet(max = 1000, keep = 500) {
		if (seenMessageKeys.size <= max) { return; }
		const reduced = Array.from(seenMessageKeys).slice(-keep);
		seenMessageKeys.clear();
		reduced.forEach(k => seenMessageKeys.add(k));
	}

	//////////////////////////////
	// 4) Parsing logic (customize)
	//////////////////////////////
	function parseMessageNode(row) {
		if (!row) { return null; }

		// Build a stable dedupe key (prefer explicit IDs if present)
		const explicitId = row.dataset && (row.dataset.messageId || row.dataset.id || row.id);

		const nameEle = getFirstBySelectors(row, CONFIG.SELECTORS.name);
		const msgEle = getFirstBySelectors(row, CONFIG.SELECTORS.message);
		const avatarEle = getFirstBySelectors(row, CONFIG.SELECTORS.avatar);

		const chatname = nameEle ? escapeHtml((nameEle.textContent || "").trim()) : "";
		const chatmessage = msgEle ? getAllContentNodes(msgEle).trim() : "";
		const chatimg = avatarEle && avatarEle.src ? (avatarEle.src + "") : "";
		const nameColor = nameEle && nameEle.style ? (nameEle.style.color || "") : CONFIG.DEFAULTS.nameColor;

		if (!chatname || !chatmessage) { return null; }

		const fallbackKey = `${chatname}::${chatmessage}`;
		const dedupeKey = explicitId || fallbackKey;

		return {
			dedupeKey,
			data: {
				chatname,
				chatbadges: CONFIG.DEFAULTS.chatbadges,
				backgroundColor: CONFIG.DEFAULTS.backgroundColor,
				textColor: CONFIG.DEFAULTS.textColor,
				nameColor,
				chatmessage,
				chatimg,
				hasDonation: CONFIG.DEFAULTS.hasDonation,
				membership: CONFIG.DEFAULTS.membership,
				contentimg: CONFIG.DEFAULTS.contentimg,
				textonly: settings.textonlymode || false,
				type: CONFIG.SOURCE_TYPE
			}
		};
	}

	function processMessageRow(row) {
		if (!row || !row.matches || !row.matches(CONFIG.MESSAGE_ROW_SELECTOR)) { return; }

		const parsed = parseMessageNode(row);
		if (!parsed) { return; }

		if (seenMessageKeys.has(parsed.dedupeKey)) { return; }
		seenMessageKeys.add(parsed.dedupeKey);
		trimSeenSet();

		row.setAttribute(CONFIG.PROCESSED_ATTR, "true");
		pushMessage(parsed.data);
	}

	//////////////////////////////
	// 5) Bridge + command handling
	//////////////////////////////
	function pushMessage(data) {
		try {
			chrome.runtime.sendMessage(chrome.runtime.id, { message: data }, function () {});
		} catch (e) {}
	}

	function focusChatInput() {
		const input = getFirstBySelectors(document, CONFIG.SELECTORS.focusInput);
		if (input && input.focus) {
			input.focus();
			return true;
		}
		return false;
	}

	chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
		try {
			if (request === "getSource") { sendResponse(CONFIG.SOURCE_TYPE); return; }
			if (request === "focusChat") { sendResponse(focusChatInput()); return; }
			if (request && typeof request === "object" && "settings" in request) {
				settings = request.settings || {};
				sendResponse(true);
				return;
			}
			if (request && typeof request === "object" && "state" in request) {
				isExtensionOn = !!request.state;
				sendResponse(true);
				return;
			}
		} catch (e) {}
		sendResponse(false);
	});

	chrome.runtime.sendMessage(chrome.runtime.id, { getSettings: true }, function (response) {
		if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.lastError) { return; }
		response = response || {};
		if (response.settings) { settings = response.settings; }
		if ("state" in response) { isExtensionOn = !!response.state; }
	});

	//////////////////////////////
	// 6) Polling bootstrap
	//////////////////////////////
	function scanMessages() {
		if (!isExtensionOn) { return; }
		try {
			document.querySelectorAll(CONFIG.MESSAGE_ROW_SELECTOR).forEach(processMessageRow);
		} catch (e) {}
	}

	function startPolling() {
		clearInterval(pollTimer);
		pollTimer = setInterval(scanMessages, CONFIG.POLL_INTERVAL_MS);
	}

	console.log(`social stream injected (${CONFIG.SOURCE_TYPE})`);
	startPolling();
})();
