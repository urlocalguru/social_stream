(function () {
	const SOURCE_TYPE = "twitch";

	function getFirst(scope, selectors) {
		for (const selector of selectors) {
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
		sourceType: SOURCE_TYPE,
		pollIntervalMs: 800,
		messageRowSelector: "[data-message-id], [data-chat-entry], [data-chat-item], [role='listitem'], .chat-line__message, .chat-message, .message, .msg, .chat-item",
		focusInputSelector: "textarea, input[type='text'], [contenteditable='true']",
		parseRow: function (row, helpers) {
			const nameEle = getFirst(row, [
				"[data-a-target='chat-message-username']",
				"[data-username]",
				".chat-author__display-name",
				".author-name",
				".username",
				".name"
			]);
			const messageEle = getFirst(row, [
				"[data-a-target='chat-line-message-body']",
				"[data-message]",
				".message-content",
				".chat-message__text",
				".text",
				".content"
			]);
			const avatarEle = getFirst(row, ["img[src]", "[data-avatar] img[src]"]);

			const chatname = nameEle ? helpers.escapeHtml((nameEle.textContent || "").trim()) : "";
			const chatmessage = messageEle ? getAllContentNodes(messageEle, helpers) : "";
			const chatimg = avatarEle && avatarEle.src ? avatarEle.src + "" : "";
			if (!chatname || !chatmessage) { return null; }

			const messageId = (row.dataset && (row.dataset.messageId || row.dataset.id || row.dataset.chatEntry)) || row.id || "";
			const dedupeKey = messageId || [chatname, chatmessage].join("::");
			return {
				dedupeKey: dedupeKey,
				data: {
					chatname: chatname,
					chatbadges: "",
					backgroundColor: "",
					textColor: "",
					nameColor: "",
					chatmessage: chatmessage,
					chatimg: chatimg,
					hasDonation: "",
					membership: "",
					contentimg: "",
					textonly: helpers.settings.textonlymode || false,
					type: SOURCE_TYPE
				}
			};
		}
	});
})();
