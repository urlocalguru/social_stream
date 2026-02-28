(function () {
	const SOURCE_TYPE = "wtv";

	window.SocialStreamSourceCommon.createPollingSource({
		sourceType: SOURCE_TYPE,
		pollIntervalMs: 500,
		messageRowSelector: "div[data-testid='virtualization-item']",
		focusInputSelector: "textarea, input[type='text'], [contenteditable='true']",
		defaults: {
			chatbadges: "",
			backgroundColor: "",
			textColor: "",
			hasDonation: "",
			membership: "",
			contentimg: ""
		},
		parseRow: function (row, helpers) {
			if (!row) { return null; }

			let name = "";
			let msg = "";
			let membership = "";
			let dedupeId = "";

			try {
				const idNode = row.querySelector("[data-testid^='message-']");
				if (idNode && idNode.dataset && idNode.dataset.testid){ dedupeId = idNode.dataset.testid; }
			} catch(e){}

			try {
				const nameEle = row.querySelector("span.max-w-\\[140px\\].truncate.text-sm.font-semibold");
				if (nameEle){ name = helpers.escapeHtml((nameEle.textContent || "").trim().replace(/:\\s*$/, "")); }
			} catch(e){}

			try {
				const roleIcon = row.querySelector("[data-testid='chat-username-moderator-icon']");
				if (roleIcon){ membership = "moderator"; }
			} catch(e){}

			try {
				const msgEle = row.querySelector("span.ml-1.align-middle.text-sm.break-words.text-\\[var\\(--color-base-foreground-primary\\)\\] > span") ||
					row.querySelector("span.ml-1.align-middle.text-sm.break-words > span") ||
					row.querySelector("span.ml-1.align-middle.text-sm.break-words");
				if (msgEle){ msg = helpers.escapeHtml((msgEle.textContent || "").trim()); }
			} catch(e){}

			if (!name || !msg){ return null; }

			return {
				dedupeKey: dedupeId || [name, msg].join("::"),
				data: {
					chatname: name,
					chatbadges: helpers.config.defaults.chatbadges,
					backgroundColor: helpers.config.defaults.backgroundColor,
					textColor: helpers.config.defaults.textColor,
					nameColor: "",
					chatmessage: msg,
					chatimg: "",
					hasDonation: helpers.config.defaults.hasDonation,
					membership: membership || helpers.config.defaults.membership,
					contentimg: helpers.config.defaults.contentimg,
					textonly: helpers.settings.textonlymode || false,
					type: SOURCE_TYPE
				}
			};
		}
	});
})();
