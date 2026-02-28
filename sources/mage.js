(function () {
	const SOURCE_TYPE = "mage";

	window.SocialStreamSourceCommon.createPollingSource({
		sourceType: SOURCE_TYPE,
		pollIntervalMs: 500,
		messageRowSelector: "div.menu.hover\\:bg-base-300.rounded-md.group",
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

			const line = row.querySelector("div.d-flex.align-items-center");
			if (!line) { return null; }

			try {
				const nameEle = line.querySelector("span.text-pink-500.font-medium.cursor-pointer");
				if (nameEle) {
					name = helpers.escapeHtml((nameEle.textContent || "").trim());
				}
			} catch (e) {}

			try {
				const roleBadge = line.querySelector(":scope > span.bg-pink-600");
				if (roleBadge) {
					membership = helpers.escapeHtml((roleBadge.textContent || "").trim());
				}
			} catch (e) {}

			try {
				const directSpans = Array.from(line.querySelectorAll(":scope > span"));
				const msgCandidates = directSpans
					.filter(function (ele) { return !ele.matches(".bg-pink-600, .text-pink-500.font-medium.cursor-pointer"); })
					.map(function (ele) { return (ele.textContent || "").trim(); })
					.filter(Boolean);
				if (msgCandidates.length) {
					msg = helpers.escapeHtml(msgCandidates[msgCandidates.length - 1]);
				}
			} catch (e) {}

			if (!name || !msg) { return null; }

			const dedupeKey = [name, msg, membership].join("::");
			if (row.dataset.ssLastKey === dedupeKey) { return null; }
			row.dataset.ssLastKey = dedupeKey;

			return {
				dedupeKey: dedupeKey,
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
