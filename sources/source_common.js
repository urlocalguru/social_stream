(function () {
	if (window.SocialStreamSourceCommon) { return; }

	function createPollingSource(config) {
		const defaults = {
			sourceType: "generic",
			pollIntervalMs: 500,
			messageRowSelector: "",
			focusInputSelector: "textarea, input[type='text'], [contenteditable='true']",
			defaults: {
				chatbadges: "",
				backgroundColor: "",
				textColor: "",
				nameColor: "",
				hasDonation: "",
				membership: "",
				contentimg: ""
			},
			maxSeenMessages: 1500,
			keepSeenMessages: 700,
			parseRow: function () { return null; },
			processRow: null,
			normalizeMessage: function (message) {
				return (message || "").toLowerCase().replace(/[!?.]+$/g, "").trim();
			},
			ignoredEventMessages: []
		};

		const settings = { textonlymode: false };
		const runtime = {
			isExtensionOn: true,
			pollTimer: null,
			seenMessageKeys: new Set()
		};
		const mergedConfig = Object.assign({}, defaults, config || {});
		mergedConfig.defaults = Object.assign({}, defaults.defaults, (config && config.defaults) || {});

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

		function pushMessage(data) {
			try {
				chrome.runtime.sendMessage(chrome.runtime.id, { message: data }, function () {});
			} catch (e) {}
		}

		function trimSeenSet() {
			if (runtime.seenMessageKeys.size <= mergedConfig.maxSeenMessages) { return; }
			const reduced = Array.from(runtime.seenMessageKeys).slice(-mergedConfig.keepSeenMessages);
			runtime.seenMessageKeys.clear();
			reduced.forEach(function (key) { runtime.seenMessageKeys.add(key); });
		}

		function hasSeen(key) {
			if (!key) { return false; }
			return runtime.seenMessageKeys.has(key);
		}

		function rememberKey(key) {
			if (!key) { return; }
			runtime.seenMessageKeys.add(key);
			trimSeenSet();
		}

		function normalizeMessage(message) {
			return mergedConfig.normalizeMessage(message);
		}

		function isIgnoredEventMessage(message) {
			const normalized = normalizeMessage(message);
			if (!normalized) { return false; }
			return mergedConfig.ignoredEventMessages.indexOf(normalized) !== -1;
		}

		function focusChatInput() {
			const input = document.querySelector(mergedConfig.focusInputSelector);
			if (input && input.focus) {
				input.focus();
				return true;
			}
			return false;
		}

		const helperContext = {
			escapeHtml: escapeHtml,
			settings: settings,
			isIgnoredEventMessage: isIgnoredEventMessage,
			normalizeMessage: normalizeMessage,
			config: mergedConfig,
			pushMessage: pushMessage,
			hasSeen: hasSeen,
			rememberKey: rememberKey,
			trimSeenSet: trimSeenSet
		};

		function processMessageRow(row) {
			if (!row || !row.matches || !row.matches(mergedConfig.messageRowSelector)) { return; }

			if (typeof mergedConfig.processRow === "function") {
				mergedConfig.processRow(row, helperContext);
				return;
			}

			const parsed = mergedConfig.parseRow(row, helperContext);
			if (!parsed || !parsed.data || !parsed.dedupeKey) { return; }
			if (hasSeen(parsed.dedupeKey)) { return; }
			rememberKey(parsed.dedupeKey);
			pushMessage(parsed.data);
		}

		function scanMessages() {
			if (!runtime.isExtensionOn) { return; }
			try {
				document.querySelectorAll(mergedConfig.messageRowSelector).forEach(processMessageRow);
			} catch (e) {}
		}

		chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
			try {
				if (request === "getSource") { sendResponse(mergedConfig.sourceType); return; }
				if (request === "focusChat") { sendResponse(focusChatInput()); return; }
				if (request && typeof request === "object" && "settings" in request) {
					Object.assign(settings, request.settings || {});
					sendResponse(true);
					return;
				}
				if (request && typeof request === "object" && "state" in request) {
					runtime.isExtensionOn = !!request.state;
					sendResponse(true);
					return;
				}
			} catch (e) {}
			sendResponse(false);
		});

		chrome.runtime.sendMessage(chrome.runtime.id, { getSettings: true }, function (response) {
			if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.lastError) { return; }
			response = response || {};
			if (response.settings) { Object.assign(settings, response.settings); }
			if ("state" in response) { runtime.isExtensionOn = !!response.state; }
		});

		console.log("social stream injected (" + mergedConfig.sourceType + ")");
		clearInterval(runtime.pollTimer);
		runtime.pollTimer = setInterval(scanMessages, mergedConfig.pollIntervalMs);
		return { scanMessages: scanMessages, config: mergedConfig };
	}

	window.SocialStreamSourceCommon = { createPollingSource: createPollingSource };
})();
