(function () {
	const SOURCE_TYPE = "tango";

	window.SocialStreamSourceCommon.createPollingSource({
		sourceType: SOURCE_TYPE,
		pollIntervalMs: 500,
		messageRowSelector: "div[data-testid^='chat-event-'].I8PsW",
		focusInputSelector: "textarea, input[type='text'], [contenteditable='true']",
		ignoredEventMessages: [
			"started watching",
			"new follower"
		],
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
			let chatimg = "";
			let membership = "";

			try {
				const nameEle = row.querySelector(".Hhi6n.P7wV2");
				if (nameEle) {
					name = helpers.escapeHtml((nameEle.textContent || "").trim());
				}
			} catch (e) {}

			try {
				const msgEle = row.querySelector(".KR99L > span");
				if (msgEle) {
					msg = helpers.escapeHtml((msgEle.textContent || "").trim());
				}
			} catch (e) {}

			try {
				const avatarEle = row.querySelector(".iE5Dk.gDmW2[data-lazybg]");
				if (avatarEle) {
					chatimg = (avatarEle.getAttribute("data-lazybg") || "").trim();
				}
			} catch (e) {}

			try {
				if (row.querySelector("[data-testid='avatar-vip-label']")) {
					membership = "vip";
				}
			} catch (e) {}

			if (!name || !msg) { return null; }
			if (helpers.isIgnoredEventMessage(msg)) { return null; }

			const eventId = row.getAttribute("data-testid") || "";
			const dedupeKey = eventId || [name, msg, chatimg].join("::");
			return {
				dedupeKey: dedupeKey,
				data: {
					chatname: name,
					chatbadges: helpers.config.defaults.chatbadges,
					backgroundColor: helpers.config.defaults.backgroundColor,
					textColor: helpers.config.defaults.textColor,
					nameColor: "",
					chatmessage: msg,
					chatimg: chatimg,
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
