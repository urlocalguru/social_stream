(function () {
	/*
	 * Social Stream Ninja Source Template (source_common.js edition)
	 *
	 * How to use:
	 * 1) Copy this file to sources/<yoursite>.js
	 * 2) Update CONFIG values
	 * 3) Tune parseRow if selector-only extraction is insufficient
	 */

	const CONFIG = {
		SOURCE_TYPE: "template",
		POLL_INTERVAL_MS: 500,
		MESSAGE_ROW_SELECTOR: ".message",
		FOCUS_INPUT_SELECTOR: "textarea, input[type='text'], [contenteditable='true']",
		SELECTORS: {
			name: [".message-info-name", ".chatUsername", "[data-username]"],
			message: [".message-content", ".chatMessage", "[data-message]"],
			avatar: ["img.avatar", ".message img[src]"]
		},
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

	function getFirst(scope, selectors) {
		for (const selector of selectors || []) {
			try {
				const found = scope.querySelector(selector);
				if (found) { return found; }
			} catch (e) {}
		}
		return null;
	}

	function getAllContentNodes(element, helpers) {
		let resp = "";
		if (!element) { return resp; }

		if (!element.childNodes || !element.childNodes.length) {
			return element.textContent ? helpers.escapeHtml(element.textContent) : "";
		}

		element.childNodes.forEach(function (node) {
			if (node.childNodes && node.childNodes.length) {
				resp += getAllContentNodes(node, helpers);
			} else if (node.nodeType === 3 && node.textContent && node.textContent.trim()) {
				resp += helpers.escapeHtml(node.textContent);
			} else if (node.nodeType === 1 && !helpers.settings.textonlymode) {
				if (node.nodeName === "IMG" && node.src) { node.src = node.src + ""; }
				resp += node.outerHTML;
			}
		});

		return resp.trim();
	}

	window.SocialStreamSourceCommon.createPollingSource({
		sourceType: CONFIG.SOURCE_TYPE,
		pollIntervalMs: CONFIG.POLL_INTERVAL_MS,
		messageRowSelector: CONFIG.MESSAGE_ROW_SELECTOR,
		focusInputSelector: CONFIG.FOCUS_INPUT_SELECTOR,
		parseRow: function (row, helpers) {
			const nameEle = getFirst(row, CONFIG.SELECTORS.name);
			const messageEle = getFirst(row, CONFIG.SELECTORS.message);
			const avatarEle = getFirst(row, CONFIG.SELECTORS.avatar);

			const chatname = nameEle ? helpers.escapeHtml((nameEle.textContent || "").trim()) : "";
			const chatmessage = messageEle ? getAllContentNodes(messageEle, helpers) : "";
			const chatimg = avatarEle && avatarEle.src ? avatarEle.src + "" : "";
			const nameColor = nameEle && nameEle.style ? (nameEle.style.color || CONFIG.DEFAULTS.nameColor) : CONFIG.DEFAULTS.nameColor;
			if (!chatname || !chatmessage) { return null; }

			const dedupeKey = (row.dataset && (row.dataset.messageId || row.dataset.id)) || row.id || [chatname, chatmessage].join("::");
			return {
				dedupeKey: dedupeKey,
				data: {
					chatname: chatname,
					chatbadges: CONFIG.DEFAULTS.chatbadges,
					backgroundColor: CONFIG.DEFAULTS.backgroundColor,
					textColor: CONFIG.DEFAULTS.textColor,
					nameColor: nameColor,
					chatmessage: chatmessage,
					chatimg: chatimg,
					hasDonation: CONFIG.DEFAULTS.hasDonation,
					membership: CONFIG.DEFAULTS.membership,
					contentimg: CONFIG.DEFAULTS.contentimg,
					textonly: helpers.settings.textonlymode || false,
					type: CONFIG.SOURCE_TYPE
				}
			};
		}
	});
})();
